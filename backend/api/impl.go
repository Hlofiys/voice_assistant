package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	mathrand "math/rand"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode"
	db "voice_assistant/db/sqlc"
	"voice_assistant/tools"

	chromago "github.com/amikos-tech/chroma-go/pkg/api/v2"
	g "github.com/amikos-tech/chroma-go/pkg/embeddings/gemini"
	genaiembs "github.com/google/generative-ai-go/genai"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/texttheater/golang-levenshtein/levenshtein"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/genai"
)

var _ ServerInterface = (*Server)(nil)

type ExtractedQueryParams struct {
	PharmacyName   string `json:"pharmacy_name"`
	PharmacyNumber string `json:"pharmacy_number"`
	City           string `json:"city"`
	Street         string `json:"street"`
	HouseNumber    string `json:"house_number"`
}

type ChatSession struct {
	ID        string
	History   []*genai.Content
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Server struct {
	jwtAuth              tools.Authenticator
	genaiClient          *genai.Client
	chatModel            string
	chromaDBClient       chromago.Client
	chromaCollectionName string
	ef                   *g.GeminiEmbeddingFunction
	db                   *db.Queries
	chatSessions         map[string]*ChatSession
	sessionMutex         sync.RWMutex
}

func NewServer(jwtAuth tools.Authenticator, client *genai.Client, clientEmbs *genaiembs.Client, chromaDBClient chromago.Client, chromaCollection string, db *db.Queries) *Server {
	chatModelName := "gemini-2.0-flash"

	ef, err := g.NewGeminiEmbeddingFunction(g.WithEnvAPIKey(), g.WithDefaultModel("text-embedding-004"), g.WithClient(clientEmbs))
	if err != nil {
		// It's better to handle this error more gracefully, perhaps by returning an error from NewServer
		log.Fatalf("Error creating Gemini embedding function: %s \n", err)
	}

	s := &Server{
		jwtAuth:              jwtAuth,
		genaiClient:          client,
		chatModel:            chatModelName,
		chromaDBClient:       chromaDBClient,
		chromaCollectionName: chromaCollection,
		ef:                   ef,
		db:                   db,
		chatSessions:         make(map[string]*ChatSession),
	}

	s.cleanupSessions()

	return s
}

func (s *Server) ConfirmEmail(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("[ConfirmEmail] Error reading request body: %v", err)
		return
	}

	var confirmEmailRequest *ConfirmEmailRequest
	err = json.Unmarshal(bodyBytes, &confirmEmailRequest)

	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("[ConfirmEmail] Error unmarshalling request body: %v", err)
		return
	}

	if confirmEmailRequest.Email == "" || confirmEmailRequest.Code == "" {
		http.Error(w, `{"message": "email and code are required"}`, http.StatusBadRequest)
		return
	}

	refreshTokenString, refreshTokenExpiresAt, err := s.jwtAuth.GenerateRefreshToken()
	if err != nil {
		http.Error(w, `{"message": "failed to generate refresh token"}`, http.StatusInternalServerError)
		log.Printf("[ConfirmEmail] Error generating refresh token for user : %v", err)
		return
	}
	updateCodeByIdParams := db.ConfirmEmailWithTokensParams{
		Email:        confirmEmailRequest.Email,
		Code:         pgtype.Text{String: confirmEmailRequest.Code, Valid: true},
		RefreshToken: pgtype.Text{String: refreshTokenString, Valid: true},
		ExpiredAt:    pgtype.Timestamp{Time: refreshTokenExpiresAt, Valid: true},
	}

	pgUserID, err := s.db.ConfirmEmailWithTokens(r.Context(), updateCodeByIdParams)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[ConfirmEmail] User/code not found for email %s, code %s: %v", confirmEmailRequest.Email, confirmEmailRequest.Code, err)
			http.Error(w, `{"message": "User for the provided email/code not found or code is invalid"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"message": "failed to confirm email address"}`, http.StatusInternalServerError)
		log.Printf("[ConfirmEmail] Database error for email %s, code %s: %v", confirmEmailRequest.Email, confirmEmailRequest.Code, err)
		return
	}

	u, err := uuid.FromBytes(pgUserID.Bytes[:])
	if err != nil {
		http.Error(w, `{"message": "internal server error - user ID conversion failed"}`, http.StatusInternalServerError)
		return
	}

	accessToken, err := s.jwtAuth.GenerateToken(u)
	if err != nil {
		http.Error(w, `{"message": "failed to generate access token"}`, http.StatusInternalServerError)
		log.Printf("[ConfirmEmail] Error generating access token: %v", err)
		return
	}

	response := ConfirmEmailResponse{
		Token:        accessToken,
		RefreshToken: refreshTokenString,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[ConfirmEmail] Error encoding success response: %v", err)
	}
}

func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("[Login] Error reading request body: %v", err)
		return
	}

	var loginRequest *LoginRequest

	err = json.Unmarshal(bodyBytes, &loginRequest)
	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("[Login] Error unmarshalling request body: %v", err)
		return
	}

	if loginRequest.Email == "" || loginRequest.Password == "" {
		http.Error(w, `{"message": "email and password are required"}`, http.StatusBadRequest)
		return
	}

	userDetails, err := s.db.GetUserAuthDetailsByEmail(r.Context(), loginRequest.Email)

	if err != nil {
		if err == sql.ErrNoRows || err == pgx.ErrNoRows {
			log.Printf("[Login] User not found for email: %s", loginRequest.Email)
			http.Error(w, `{"message": "invalid email or password"}`, http.StatusUnauthorized)
			return
		}
		log.Printf("[Login] Database error fetching user details for email %s: %v", loginRequest.Email, err)
		http.Error(w, `{"message": "internal server error while fetching user data"}`, http.StatusInternalServerError)
		return
	}

	if userDetails.Code.Valid && userDetails.Code.String != "" {
		log.Printf("[Login] User email not verified for: %s. Code: '%s'", loginRequest.Email, userDetails.Code.String)
		http.Error(w, `{"message": "Please verify your email address before logging in."}`, http.StatusBadRequest)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(userDetails.Password), []byte(loginRequest.Password))
	if err != nil {
		log.Printf("[Login] Invalid password for email: %s", loginRequest.Email)
		http.Error(w, `{"message": "invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	refreshTokenString, refreshTokenExpiresAt, err := s.jwtAuth.GenerateRefreshToken()
	if err != nil {
		http.Error(w, `{"message": "failed to generate refresh token"}`, http.StatusInternalServerError)
		log.Printf("[Login] Error generating refresh token for user %s: %v", loginRequest.Email, err)
		return
	}

	updateTokenParams := db.UpdateRefreshTokenParams{
		RefreshToken: pgtype.Text{String: refreshTokenString, Valid: true},
		ExpiredAt:    pgtype.Timestamp{Time: refreshTokenExpiresAt, Valid: true},
		UserID:       userDetails.UserID,
	}
	err = s.db.UpdateRefreshToken(r.Context(), updateTokenParams)
	if err != nil {
		log.Printf("[Login] Failed to update refresh token for user %s (ID: %s): %v", loginRequest.Email, userDetails.UserID.Bytes, err)
		http.Error(w, `{"message": "failed to save session"}`, http.StatusInternalServerError)
		return
	}

	appUserID, err := uuid.FromBytes(userDetails.UserID.Bytes[:])
	if err != nil {
		http.Error(w, `{"message": "internal server error - user ID conversion failed"}`, http.StatusInternalServerError)
		log.Printf("[Login] Error converting user ID for %s: %v", loginRequest.Email, err)
		return
	}

	accessToken, err := s.jwtAuth.GenerateToken(appUserID)
	if err != nil {
		http.Error(w, `{"message": "failed to generate access token"}`, http.StatusInternalServerError)
		log.Printf("[Login] Error generating access token: %v", err)
		return
	}

	response := LoginResponse{
		Token:        accessToken,
		RefreshToken: refreshTokenString,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[Login] Error encoding success response for user %s: %v", loginRequest.Email, err)
	}

}

func (s *Server) RefreshTokens(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("[ValidateRefreshToken] Error reading request body: %v", err)
		return
	}

	var refreshRequest *RefreshRequest
	err = json.Unmarshal(bodyBytes, &refreshRequest)

	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("[ValidateRefreshToken] Error unmarshalling request body: %v", err)
		return
	}

	if refreshRequest.RefreshToken == "" {
		http.Error(w, `{"message": "refresh token are required"}`, http.StatusBadRequest)
		return
	}

	params := db.VerifyRefreshTokenParams{
		RefreshToken: pgtype.Text{String: refreshRequest.RefreshToken, Valid: true},
		ExpiredAt:    pgtype.Timestamp{Time: time.Now(), Valid: true},
	}

	pgDbUserID, err := s.db.VerifyRefreshToken(r.Context(), params)

	if err != nil {
		if err == pgx.ErrNoRows {
			log.Printf("[RefreshTokens] Invalid or expired refresh token: %s", refreshRequest.RefreshToken)
			http.Error(w, `{"message": "invalid or expired refresh token"}`, http.StatusUnauthorized)
			return
		}
		log.Printf("[RefreshTokens] Database error verifying refresh token: %v", err)
		http.Error(w, `{"message": "internal server error while validating token"}`, http.StatusInternalServerError)
		return
	}

	appUserID, err := uuid.FromBytes(pgDbUserID.Bytes[:])
	if err != nil {
		log.Printf("[RefreshTokens] Error converting user ID: %v", err)
		http.Error(w, `{"message": "internal server error - user ID conversion failed"}`, http.StatusInternalServerError)
		return
	}

	newAccessToken, err := s.jwtAuth.GenerateToken(appUserID)
	if err != nil {
		log.Printf("[RefreshTokens] Error generating new access token for user %s: %v", appUserID, err)
		http.Error(w, `{"message": "failed to generate new access token"}`, http.StatusInternalServerError)
		return
	}

	newRefreshTokenString, newRefreshTokenExpiresAt, err := s.jwtAuth.GenerateRefreshToken()
	if err != nil {
		log.Printf("[RefreshTokens] Error generating new refresh token for user %s: %v", appUserID, err)
		http.Error(w, `{"message": "failed to generate new refresh token"}`, http.StatusInternalServerError)
		return
	}

	updateTokenParams := db.UpdateRefreshTokenParams{
		RefreshToken: pgtype.Text{String: newRefreshTokenString, Valid: true},
		ExpiredAt:    pgtype.Timestamp{Time: newRefreshTokenExpiresAt, Valid: true},
		UserID:       pgDbUserID,
	}

	err = s.db.UpdateRefreshToken(r.Context(), updateTokenParams)
	if err != nil {
		log.Printf("[RefreshTokens] Failed to update new refresh token for user ID %s: %v", appUserID, err)
		http.Error(w, `{"message": "failed to save new session"}`, http.StatusInternalServerError)
		return
	}

	response := RefreshResponse{
		Token:        newAccessToken,
		RefreshToken: newRefreshTokenString,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[RefreshTokens] Error encoding success response for user ID %s: %v", appUserID, err)
	}

}

func (s *Server) Logout(w http.ResponseWriter, r *http.Request) {
	userIDFromToken, ok := r.Context().Value(tools.UserIDContextKey).(string)
	if !ok || userIDFromToken == "" {
		log.Println("[Logout] UserID not found in context. Auth middleware might not have run or token is problematic.")
		http.Error(w, `{"message": "Unauthorized: User identification not found"}`, http.StatusUnauthorized)
		return
	}

	parsedUUID, err := uuid.Parse(userIDFromToken)
	if err != nil {
		log.Printf("[Logout] UserID '%s' from token is not a valid UUID format: %v", userIDFromToken, err)
		http.Error(w, `{"message": "Unauthorized: Invalid user identification format in token"}`, http.StatusUnauthorized)
		return
	}

	pgUserIDToLogout := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	err = s.db.LogoutById(r.Context(), pgUserIDToLogout)
	if err != nil {
		log.Printf("[Logout] Database error while invalidating refresh token for UserID '%s': %v", userIDFromToken, err)
		http.Error(w, `{"message": "Logout failed due to a server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	responseMessage := map[string]string{"message": "Successfully logged out"}
	if err := json.NewEncoder(w).Encode(responseMessage); err != nil {
		log.Printf("[Logout] Error encoding success response for UserID '%s': %v", userIDFromToken, err)
	}
}

func (s *Server) Register(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("[Register] Error reading request body: %v", err)
		return
	}

	var registerRequest RegisterRequest
	err = json.Unmarshal(bodyBytes, &registerRequest)

	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("[Register] Error unmarshalling request body: %v", err)
		return
	}

	if registerRequest.Email == "" || registerRequest.Password == "" {
		http.Error(w, `{"message": "email and password are required"}`, http.StatusBadRequest)
		return
	}

	_, err = s.db.GetUserAuthDetailsByEmail(r.Context(), registerRequest.Email)
	if err == nil {
		http.Error(w, `{"message": "user with this email already exists"}`, http.StatusConflict)
		log.Printf("[Register] Attempt to register with existing email: %s", registerRequest.Email)
		return
	}
	if err != sql.ErrNoRows && err != pgx.ErrNoRows {
		http.Error(w, `{"message": "failed to check email availability"}`, http.StatusInternalServerError)
		log.Printf("[Register] Error checking email availability for %s: %v", registerRequest.Email, err)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(registerRequest.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"message": "failed to hash password"}`, http.StatusInternalServerError)
		log.Printf("[Register] Error hashing password: %v", err)
		return
	}

	userID, err := uuid.NewRandom()
	if err != nil {
		http.Error(w, `{"message": "failed to generate user ID"}`, http.StatusInternalServerError)
		log.Printf("[Register] Error generating userID: %v", err)
		return
	}

	confirmationCode, err := generateNumericCode(6)
	if err != nil {
		http.Error(w, `{"message": "failed to generate confirmation code"}`, http.StatusInternalServerError)
		log.Printf("[Register] Error generating confirmation code: %v", err)
		return
	}

	createUserParams := db.CreateUserParams{
		UserID:   pgtype.UUID{Bytes: userID, Valid: true},
		Email:    registerRequest.Email,
		Password: string(hashedPassword),
		Code:     pgtype.Text{String: confirmationCode, Valid: true},
	}

	err = s.db.CreateUser(r.Context(), createUserParams)
	if err != nil {
		http.Error(w, `{"message": "failed to register user"}`, http.StatusInternalServerError)
		log.Printf("[Register] Error creating user in DB: %v", err)
		return
	}

	response := RegisterResponse{
		Message: "Registration successful. Please check your email to verify your account. Your confirmation code is: #" + confirmationCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[Register] Error encoding success response: %v", err)
	}

}

func (s *Server) ValidateToken(w http.ResponseWriter, r *http.Request) {

	response := struct {
		Message string `json:"message"`
	}{
		Message: "Token is valid.",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[ValidateToken] Error encoding success response: %v", err)
	}
}

func (s *Server) RequestPasswordResetCode(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("[Register] Error reading request body: %v", err)
		return
	}
	var passwordResetCodeRequest *PasswordResetCodeRequest
	err = json.Unmarshal(bodyBytes, &passwordResetCodeRequest)
	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("[RequestPasswordResetCode] Error unmarshalling request body: %v", err)
		return
	}

	if passwordResetCodeRequest.Email == "" {
		http.Error(w, `{"message": "email are required"}`, http.StatusBadRequest)
		return
	}

	pgUserID, err := s.db.GetUserByEmail(r.Context(), passwordResetCodeRequest.Email)
	if err != nil {
		if err == sql.ErrNoRows || err == pgx.ErrNoRows {
			log.Printf("[RequestPasswordResetCode] User not found for email: %s", passwordResetCodeRequest.Email)
			http.Error(w, `{"message": "user not found"}`, http.StatusNotFound)
			return
		}
		log.Printf("[RequestPasswordResetCode] Database error fetching user for email %s: %v", passwordResetCodeRequest.Email, err)
		http.Error(w, `{"message": "internal server error while fetching user data"}`, http.StatusInternalServerError)
		return
	}

	resetCode, err := generateNumericCode(6)
	if err != nil {
		log.Printf("[RequestPasswordResetCode] Error generating reset code for email %s: %v", passwordResetCodeRequest.Email, err)
		http.Error(w, `{"message": "failed to generate reset code"}`, http.StatusInternalServerError)
		return
	}

	updateCodeParams := db.UpdateCodeByUserIdParams{
		Code:   pgtype.Text{String: resetCode, Valid: true},
		UserID: pgUserID,
	}
	err = s.db.UpdateCodeByUserId(r.Context(), updateCodeParams)
	if err != nil {
		log.Printf("[RequestPasswordResetCode] Failed to update reset code for user ID %s: %v", pgUserID.Bytes, err)
		http.Error(w, `{"message": "failed to save reset code"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	response := PasswordResetCodeResponse{
		Email:   passwordResetCodeRequest.Email,
		Message: "Password reset code sent to your email. Your code is #" + resetCode,
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[RequestPasswordResetCode] Error encoding success response for email %s: %v", passwordResetCodeRequest.Email, err)
	}
}

func (s *Server) ResetPasswordWithCode(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("[Register] Error reading request body: %v", err)
		return
	}
	var passwordResetWithCodeRequest *PasswordResetWithCodeRequest

	err = json.Unmarshal(bodyBytes, &passwordResetWithCodeRequest)
	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("[RequestPasswordResetCode] Error unmarshalling request body: %v", err)
		return
	}

	if passwordResetWithCodeRequest.Email == "" || passwordResetWithCodeRequest.NewPassword == "" || passwordResetWithCodeRequest.Code == "" {
		http.Error(w, `{"message": "email, password and code are required"}`, http.StatusBadRequest)
		return
	}

	pgUserID, err := s.db.GetUserByEmail(r.Context(), passwordResetWithCodeRequest.Email)
	if err != nil {
		if err == sql.ErrNoRows || err == pgx.ErrNoRows {
			log.Printf("[ResetPasswordWithCode] User not found for email: %s", passwordResetWithCodeRequest.Email)
			http.Error(w, `{"message": "user not found"}`, http.StatusNotFound)
			return
		}
		log.Printf("[ResetPasswordWithCode] Database error fetching user for email %s: %v", passwordResetWithCodeRequest.Email, err)
		http.Error(w, `{"message": "internal server error while fetching user data"}`, http.StatusInternalServerError)
		return
	}

	hashedNewPassword, err := bcrypt.GenerateFromPassword([]byte(passwordResetWithCodeRequest.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"message": "failed to hash new password"}`, http.StatusInternalServerError)
		log.Printf("[ResetPasswordWithCode] Error hashing new password for email %s: %v", passwordResetWithCodeRequest.Email, err)
		return
	}

	refreshTokenString, refreshTokenExpiresAt, err := s.jwtAuth.GenerateRefreshToken()
	if err != nil {
		http.Error(w, `{"message": "failed to generate refresh token"}`, http.StatusInternalServerError)
		log.Printf("[ResetPasswordWithCode] Error generating refresh token for user %s: %v", passwordResetWithCodeRequest.Email, err)
		return
	}

	resetPasswordParams := db.ResetPasswordWithCodeAndSetTokensParams{
		UserID:       pgUserID,
		Code:         pgtype.Text{String: passwordResetWithCodeRequest.Code, Valid: true},
		RefreshToken: pgtype.Text{String: refreshTokenString, Valid: true},
		ExpiredAt:    pgtype.Timestamp{Time: refreshTokenExpiresAt, Valid: true},
		Email:        passwordResetWithCodeRequest.Email,
		Password:     string(hashedNewPassword),
	}

	_, err = s.db.ResetPasswordWithCodeAndSetTokens(r.Context(), resetPasswordParams)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, sql.ErrNoRows) {
			log.Printf("[ResetPasswordWithCode] Failed to update password: invalid code or email. Email: %s, Code: %s", passwordResetWithCodeRequest.Email, passwordResetWithCodeRequest.Code)
			http.Error(w, `{"message": "Invalid request: code is incorrect or already used"}`, http.StatusBadRequest)
			return
		}
		log.Printf("[ResetPasswordWithCode] Database error resetting password for email %s: %v", passwordResetWithCodeRequest.Email, err)
		http.Error(w, `{"message": "failed to reset password"}`, http.StatusInternalServerError)
		return
	}

	appUserID, err := uuid.FromBytes(pgUserID.Bytes[:])
	if err != nil {
		log.Printf("[ResetPasswordWithCode] Error converting user ID: %v", err)
		http.Error(w, `{"message": "internal server error - user ID conversion failed"}`, http.StatusInternalServerError)
		return
	}

	accessToken, err := s.jwtAuth.GenerateToken(appUserID)
	if err != nil {
		http.Error(w, `{"message": "failed to generate access token"}`, http.StatusInternalServerError)
		log.Printf("[ResetPasswordWithCode] Error generating access token for user %s: %v", passwordResetWithCodeRequest.Email, err)
		return
	}

	response := PasswordResetWithCodeResponse{
		Token:        accessToken,
		RefreshToken: refreshTokenString,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[ResetPasswordWithCode] Error encoding success response for email %s: %v", passwordResetWithCodeRequest.Email, err)
	}
}

func generateNumericCode(length int) (string, error) {
	const otpChars = "0123456789"
	buffer := make([]byte, length)
	_, err := rand.Read(buffer)
	if err != nil {
		return "", fmt.Errorf("failed to read random bytes for code: %w", err)
	}

	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(otpChars))))
		if err != nil {
			return "", fmt.Errorf("failed to generate random number for code: %w", err)
		}
		buffer[i] = otpChars[num.Int64()]
	}
	return string(buffer), nil
}

// ---------------- utils ----------------
func normalize(s string) string {
	// убираем регистр, спец. символы, пробелы
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}
func fuzzyEqual(a, b string, maxDist int) bool {
	return levenshtein.DistanceForStrings(
		[]rune(normalize(a)), []rune(normalize(b)),
		levenshtein.DefaultOptions) <= maxDist
}

func (s *Server) getOrCreateSession(sessionID string) *ChatSession {
	s.sessionMutex.Lock()
	defer s.sessionMutex.Unlock()

	if session, exists := s.chatSessions[sessionID]; exists {
		session.UpdatedAt = time.Now()
		return session
	}

	session := &ChatSession{
		ID:        sessionID,
		History:   make([]*genai.Content, 0),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	s.chatSessions[sessionID] = session
	return session
}

// Clean up old sessions periodically
func (s *Server) cleanupSessions() {
	ticker := time.NewTicker(30 * time.Minute)
	go func() {
		for range ticker.C {
			s.sessionMutex.Lock()
			now := time.Now()
			for id, session := range s.chatSessions {
				if now.Sub(session.UpdatedAt) > 1*time.Hour {
					delete(s.chatSessions, id)
				}
			}
			s.sessionMutex.Unlock()
		}
	}()
}

// ---------------------------------------

func (s *Server) Chat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	err := r.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		log.Printf("[Chat] Error parsing multipart form: %v", err)
		http.Error(w, `{"message": "invalid multipart form: `+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	sessionID := r.FormValue("session_id")
	if sessionID == "" {
		sessionID = generateSessionID() // implement this to generate unique IDs
	}

	session := s.getOrCreateSession(sessionID)

	log.Printf("[Chat] Session ID: %s, History length: %d", sessionID, len(session.History))

	audioFile, fileHeader, err := r.FormFile("audio")
	if err != nil {
		log.Printf("[Chat] Error getting audio file from form: %v", err)
		http.Error(w, `{"message": "audio file is required: `+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	defer audioFile.Close()

	log.Printf("[Chat] Received audio file: %s, Size: %d, MIME: %s",
		fileHeader.Filename, fileHeader.Size, fileHeader.Header.Get("Content-Type"))

	audioBytes, err := io.ReadAll(audioFile)
	if err != nil {
		log.Printf("[Chat] Error reading audio file into bytes: %v", err)
		http.Error(w, `{"message": "failed to read audio file: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	audioBlob := genai.Blob{
		MIMEType: fileHeader.Header.Get("Content-Type"),
		Data:     audioBytes,
	}
	audioDataPart := genai.Part{InlineData: &audioBlob}

	// 1. Define the tool for Gemini
	findPharmacyTool := &genai.Tool{
		FunctionDeclarations: []*genai.FunctionDeclaration{{
			Name:        "find_pharmacies",
			Description: "Searches for pharmacies based on user query and extracted criteria like name, number, city, street, and house number. Also requires the full transcription of the user's audio query.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"user_query_transcription": {Type: genai.TypeString, Description: "The full transcribed text of the user's audio query. This field is mandatory. Example: 'Найди аптеку номер 5 на улице Ленина в Минске'"},
					"pharmacy_name":            {Type: genai.TypeString, Description: "Name of the pharmacy, e.g., 'Планета Здоровья', 'Adel'. Do not include generic prefixes like 'Аптека '. Optional."},
					"pharmacy_number":          {Type: genai.TypeString, Description: "Number of the pharmacy, e.g., '10', '25'. Do not include generic prefixes like 'Номер аптеки '. Optional."},
					"city":                     {Type: genai.TypeString, Description: "City name, e.g., 'Минск', 'Гомель'. Do not include generic prefixes like 'город '. Optional."},
					"street":                   {Type: genai.TypeString, Description: "Street name, e.g., 'Ленина', 'Советская'. Do not include generic prefixes like 'улица '. Optional."},
					"house_number":             {Type: genai.TypeString, Description: "House number, e.g., '15', '23а'. Optional."},
				},
				Required: []string{"user_query_transcription"},
			},
		}},
	}

	// 2. Prepare GenerateContentConfig for creating the chat session with tools
	chatConfig := &genai.GenerateContentConfig{
		Tools: []*genai.Tool{findPharmacyTool},
		// You can specify ToolConfig if needed, e.g., to force a function call or set a specific mode.
		// Example:
		ToolConfig: &genai.ToolConfig{
			FunctionCallingConfig: &genai.FunctionCallingConfig{
				Mode: genai.FunctionCallingConfigModeAuto, // Or ANY, NONE
			},
		},
	}

	// Start a new chat session using s.genaiClient.Chats.Create
	// Pass chatConfig here to enable tools for this session.
	// The 'history' argument can be nil for a new chat.
	chatSession, err := s.genaiClient.Chats.Create(ctx, s.chatModel, chatConfig, session.History)
	if err != nil {
		log.Printf("[Chat] Error creating chat session: %v", err)
		http.Error(w, `{"message": "failed to initialize AI chat: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// 3. Construct the first message to the LLM (prompt + audio)
	prompt1Text := `Ты русскоязычный голосовой помощник, специализирующийся на поиске аптек.

1. Твоя основная задача — помочь пользователю найти конкретную аптеку или узнать информацию о ней.  
2. Все ответы предназначены для синтеза речи, поэтому:  
   • текст должен быть максимально коротким и информативным;  
   • запрещены любые элементы форматирования, спец-символы, \ перед кавычками и \n-последовательности;  
   • итоговая фраза должна читаться слитно (можно использовать точку для паузы).  
2-bis. Обязательность вызова find_pharmacies
• Если в транскрипции присутствует слово «аптека» (или pharmacy/pharm/лекарство) ИЛИ названы параметры, характерные для аптек (название, номер аптеки, улица, город, телефон), считай, что пользователь ХОЧЕТ получить информацию, даже если предложение оформлено как утверждение, фрагмент или перечисление («Номер телефона аптеки Искомет на Рокоссовского 80», «Аптека Диалпро номер 9 Минск» и т.п.).
• В таких случаях ОБЯЗАТЕЛЬНО вызывай инструмент find_pharmacies по правилам пункта 4. Запрещено отвечать пользователю «как есть» только транскрипцией.
• Исключение одно — если запрос явно не о поиске (например: «Я работаю в аптеке» или «Я живу возле аптеки») и при этом пользователь не просит никакой информации о ней.
3. После получения аудиозапроса:  
   a) Выполни точную транскрипцию на русском.  
	  • Числа пиши цифрами.  
	  • Названия городов — в именительном падеже.  
	  • Никаких лишних комментариев.  
   б) Определи, связан ли запрос с поиском аптек.  
	  • Если нет — ответь по существу без вызова инструментов.  

4. Если запрос связан с аптеками:  
   a) Извлеки из транскрипции параметры (если явно названы):  
	  pharmacy_name, pharmacy_number, city, street, house_number.  
	  • Не добавляй слова «аптека», «город», «улица» и т.д.  
   b) Вызови инструмент find_pharmacies, передав:  
	  • user_query_transcription — полную транскрипцию;  
	  • найденные параметры (пустые не передавай).  
   c) ВАЖНО: Если это продолжение диалога, учитывай контекст предыдущих сообщений. Если пользователь отвечает на твой уточняющий вопрос, объедини новую информацию с ранее упомянутыми параметрами.

5. Обработка результатов find_pharmacies:  
   a) Если по совокупности параметров можно однозначно определить одну аптеку (уникальное сочетание), выдай краткий ответ в формате:  
	  «Аптека <pharmacy_name> номер <pharmacy_number> находится в городе <city>, <street>, дом <house_number>. Телефон: <phone>.»  
	  • Пропускай номер аптеки, улицу или дом, если их нет в данных.  
	  • Используй ровно одну точку-паузу между частями, без переносов строк.  
   b) Если данных недостаточно и нашлось несколько кандидатов, НЕ перечисляй их. Задай короткий уточняющий вопрос, например:  
	  «Уточните, пожалуйста, улицу или номер аптеки.»  
5-bis. Определение уникальности
• Считай аптеку уникально найденной, если среди результатов RAG есть ХОТЯ БЫ ОДНА запись, совпадающая с каждым из явно указанных пользователем параметров (city, pharmacy_number и/или pharmacy_name) после нормализации.
• Нормализация имени аптеки:  
  – регистр не учитывается;  
  – игнорируются пробелы, дефисы и точка перед «номер»;  
  – допускается латинская транслитерация/орфографическая ошибка до расстояния Левенштейна ≤ 2.  
• Если такая запись найдена, выдай ответ только по ней, даже если инструмент вернул больше результатов.

6. Никогда не выводи списки аптек. Либо точный ответ по одной аптеке, либо просьба уточнить.  

7. Соблюдай лаконичность: не более двух коротких предложений в ответе.`
	promptTextPart := genai.Part{Text: prompt1Text}
	initialUserParts := []genai.Part{promptTextPart, audioDataPart}

	// 4. Send the first message to LLM using the chatSession
	log.Println("[Chat] Sending first message to LLM (transcription & tool use attempt)...")
	resp1, err := chatSession.SendMessage(ctx, initialUserParts...)
	if err != nil {
		log.Printf("[Chat] Error in first LLM call: %v", err)
		http.Error(w, `{"message": "failed to process audio: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// Add user message to history
	// Convert []genai.Part to []*genai.Part
	userPartsPtrs := make([]*genai.Part, len(initialUserParts))
	for i := range initialUserParts {
		userPartsPtrs[i] = &initialUserParts[i]
	}
	userContent := &genai.Content{
		Role:  "user",
		Parts: userPartsPtrs,
	}
	session.History = append(session.History, userContent)

	// 5. Process LLM's first response
	if resp1 == nil || len(resp1.Candidates) == 0 || resp1.Candidates[0].Content == nil {
		log.Println("[Chat] LLM first response is empty or invalid.")
		http.Error(w, `{"message": "failed to get a response from AI"}`, http.StatusInternalServerError)
		return
	}

	llmFirstResponseCandidate := resp1.Candidates[0]
	var userQuery string
	var extractedParamsFromTool ExtractedQueryParams
	var functionCallToExecute *genai.FunctionCall

	if llmFirstResponseCandidate.Content != nil {
		for _, part := range llmFirstResponseCandidate.Content.Parts {
			if part.FunctionCall != nil {
				functionCallToExecute = part.FunctionCall
				break
			}
		}
	}

	var assistantResponseText string

	if functionCallToExecute != nil && functionCallToExecute.Name == "find_pharmacies" {
		log.Printf("[Chat] LLM requested to call function: %s with args: %v", functionCallToExecute.Name, functionCallToExecute.Args)
		args := functionCallToExecute.Args
		if t, ok := args["user_query_transcription"].(string); ok && t != "" {
			userQuery = t
		} else {
			log.Println("[Chat] Error: 'user_query_transcription' missing, empty, or not a string in function call args.")
			http.Error(w, `{"message": "AI failed to provide transcription for search."}`, http.StatusInternalServerError)
			return
		}
		log.Printf("[Chat] Transcribed query from tool args: %s", userQuery)

		if name, ok := args["pharmacy_name"].(string); ok {
			extractedParamsFromTool.PharmacyName = name
		}
		if num, ok := args["pharmacy_number"].(string); ok {
			extractedParamsFromTool.PharmacyNumber = num
		}
		if city, ok := args["city"].(string); ok {
			extractedParamsFromTool.City = city
		}
		if street, ok := args["street"].(string); ok {
			extractedParamsFromTool.Street = street
		}
		if house, ok := args["house_number"].(string); ok {
			extractedParamsFromTool.HouseNumber = house
		}
		log.Printf("[Chat] Extracted Params via Function Call: %+v", extractedParamsFromTool)

		// --- Perform ChromaDB query ---
		collection, err := s.chromaDBClient.GetCollection(ctx, s.chromaCollectionName, chromago.WithEmbeddingFunctionGet(s.ef))
		if err != nil {
			log.Printf("[Chat] Error getting ChromaDB collection: %v", err)
			http.Error(w, `{"message": "failed to access pharmacy database: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		// 1. строим векторный текст = «Минск Жудро 16 <имя> номер 30»
		var queryTextBuilder strings.Builder
		ep := extractedParamsFromTool
		if ep.City != "" {
			queryTextBuilder.WriteString(ep.City + " ")
		}
		if ep.Street != "" {
			queryTextBuilder.WriteString(ep.Street + " ")
		}
		if ep.HouseNumber != "" {
			queryTextBuilder.WriteString(ep.HouseNumber + " ")
		}
		if ep.PharmacyName != "" {
			queryTextBuilder.WriteString(ep.PharmacyName + " ")
		}
		if ep.PharmacyNumber != "" {
			queryTextBuilder.WriteString("номер " + ep.PharmacyNumber)
		}

		// 2. строгий AND-фильтр по «географии»
		var strictClauses []chromago.WhereClause
		if ep.City != "" {
			strictClauses = append(strictClauses, chromago.EqString("city", ep.City))
		}
		if ep.Street != "" {
			strictClauses = append(strictClauses, chromago.EqString("street", ep.Street))
		}
		if ep.HouseNumber != "" {
			strictClauses = append(strictClauses, chromago.EqString("house_number", ep.HouseNumber))
		}
		if ep.PharmacyName != "" {
			strictClauses = append(strictClauses, chromago.EqString("pharmacy_name", ep.PharmacyName))
		}
		if ep.PharmacyNumber != "" {
			strictClauses = append(strictClauses, chromago.EqString("pharmacy_number", ep.PharmacyNumber))
		}

		queryOpts := []chromago.CollectionQueryOption{
			chromago.WithQueryTexts(strings.TrimSpace(queryTextBuilder.String())),
			chromago.WithNResults(10),
		}
		if len(strictClauses) > 0 {
			strictFilter := strictClauses[0]
			if len(strictClauses) > 1 {
				strictFilter = chromago.And(strictClauses...)
			}
			queryOpts = append(queryOpts, chromago.WithWhereQuery(strictFilter))
		}
		queryOpts = append(queryOpts, chromago.WithIncludeQuery(chromago.IncludeDocuments, chromago.IncludeMetadatas))

		retrievedDocs, err := collection.Query(ctx, queryOpts...)
		if err != nil {
			log.Printf("[Chat] Error querying ChromaDB: %v", err)
			http.Error(w, `{"message": "failed to query pharmacy database: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		// 3. fallback, если строгий поиск ничего не вернул
		if len(retrievedDocs.GetDocumentsGroups()[0]) == 0 {
			log.Println("[Chat] Strict AND-поиск пуст – делаем fallback OR.")
			var looseClauses []chromago.WhereClause
			if ep.PharmacyName != "" {
				looseClauses = append(looseClauses, chromago.EqString("pharmacy_name", ep.PharmacyName))
			}
			if ep.PharmacyNumber != "" {
				looseClauses = append(looseClauses, chromago.EqString("pharmacy_number", ep.PharmacyNumber))
			}
			if ep.City != "" {
				looseClauses = append(looseClauses, chromago.EqString("city", ep.City))
			}
			if ep.Street != "" {
				looseClauses = append(looseClauses, chromago.EqString("street", ep.Street))
			}
			if ep.HouseNumber != "" {
				looseClauses = append(looseClauses, chromago.EqString("house_number", ep.HouseNumber))
			}

			// тот же queryText, но OR-фильтр
			fallbackOpts := []chromago.CollectionQueryOption{
				chromago.WithQueryTexts(strings.TrimSpace(queryTextBuilder.String())),
				chromago.WithNResults(10),
				chromago.WithIncludeQuery(chromago.IncludeDocuments, chromago.IncludeMetadatas),
			}
			if len(looseClauses) > 0 {
				fallbackOpts = append(fallbackOpts, chromago.WithWhereQuery(chromago.Or(looseClauses...)))
			}
			retrievedDocs, err = collection.Query(ctx, fallbackOpts...)
			if err != nil {
				log.Printf("[Chat] Error querying ChromaDB fallback: %v", err)
				http.Error(w, `{"message": "failed to query pharmacy database fallback: `+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
		}

		// 4. post-фаззи-фильтр по имени/номеру (≤2 ошибки)
		var finalDocs []chromago.Document
		docsGroups := retrievedDocs.GetDocumentsGroups()
		metaGroups := retrievedDocs.GetMetadatasGroups()
		for gi, metaGroup := range metaGroups {
			docGroup := docsGroups[gi]
			for di, meta := range metaGroup {
				good := true
				if ep.PharmacyName != "" {
					meta, _ := meta.GetString("pharmacy_name")
					if !fuzzyEqual(meta, ep.PharmacyName, 4) {
						good = false
					}
				}
				if good && ep.PharmacyNumber != "" {
					meta, _ := meta.GetString("pharmacy_number")
					if !fuzzyEqual(meta, ep.PharmacyNumber, 1) {
						good = false
					}
				}
				if good && ep.City != "" {
					meta, _ := meta.GetString("city")
					if !fuzzyEqual(meta, ep.City, 2) {
						good = false
					}
				}
				if good && ep.Street != "" {
					meta, _ := meta.GetString("street")
					if !fuzzyEqual(meta, ep.Street, 2) {
						good = false
					}
				}
				if good && ep.HouseNumber != "" {
					meta, _ := meta.GetString("house_number")
					if !fuzzyEqual(meta, ep.HouseNumber, 1) {
						good = false
					}
				}
				if good {
					finalDocs = append(finalDocs, docGroup[di])
				}
			}
		}

		var rag strings.Builder
		if len(finalDocs) == 0 {
			rag.WriteString("Информация по запросу не найдена в базе данных.")
		} else {
			rag.WriteString("Найденная информация:\n")
			for i, d := range finalDocs {
				rag.WriteString(fmt.Sprintf("%d. %s\n", i+1, d.ContentString()))
				if i == 4 {
					break
				} // максимум 5 записей
			}
		}
		if rag.Len() == 0 {
			log.Println("[Chat] No relevant documents retrieved from ChromaDB or documents were empty.")
			rag.WriteString("Информация по запросу не найдена в базе данных.")
		}
		log.Printf("[Chat] RAG Context for LLM (call 2): %s", rag.String())
		// --- End ChromaDB query ---

		funcResponseData := map[string]any{"search_results_summary": rag.String()}
		fnResponse := genai.FunctionResponse{Name: functionCallToExecute.Name, Response: funcResponseData}
		toolResponsePart := genai.Part{FunctionResponse: &fnResponse}

		// 6. Send the function response back to the LLM
		log.Println("[Chat] Sending function response to LLM for final answer generation...")
		resp2, err := chatSession.SendMessage(ctx, toolResponsePart)
		if err != nil {
			log.Printf("[Chat] Error in second LLM call (after function response): %v", err)
			http.Error(w, `{"message": "failed to generate final response: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		if resp2 == nil || len(resp2.Candidates) == 0 || resp2.Candidates[0].Content == nil || len(resp2.Candidates[0].Content.Parts) == 0 {
			log.Println("[Chat] LLM second response (final) is empty or invalid.")
			assistantResponseText = "Простите, я не смог сформировать ответ. Пожалуйста, попробуйте еще раз."
		} else {
			assistantResponseText = resp2.Text()
		}
	} else {
		log.Println("[Chat] LLM did not request a function call. Trying to extract transcription and send to LLM for answer.")
		// Try to extract transcription from the first response
		var extractedTranscription string
		if llmFirstResponseCandidate.Content != nil {
			for _, part := range llmFirstResponseCandidate.Content.Parts {
				if part.Text != "" {
					extractedTranscription = part.Text
					break
				}
			}
		}
		if extractedTranscription != "" {
			log.Printf("[Chat] Sending extracted transcription to LLM for answer: %s", extractedTranscription)
			transcriptionPart := genai.Part{Text: extractedTranscription}
			respTrans, err := chatSession.SendMessage(ctx, transcriptionPart)
			if err != nil {
				log.Printf("[Chat] Error sending transcription to LLM: %v", err)
				assistantResponseText = extractedTranscription // fallback
			} else if respTrans != nil && len(respTrans.Candidates) > 0 && respTrans.Candidates[0].Content != nil && len(respTrans.Candidates[0].Content.Parts) > 0 {
				assistantResponseText = respTrans.Text()
				userQuery = extractedTranscription
			} else {
				log.Println("[Chat] LLM response to transcription is empty or invalid.")
				assistantResponseText = extractedTranscription // fallback
			}
		} else {
			log.Println("[Chat] No transcription found in LLM response, using direct textual response.")
			assistantResponseText = resp1.Text()
		}
	}

	// Final response handling
	if assistantResponseText == "" {
		log.Println("[Chat] Assistant response is empty.")
		finishReason := genai.FinishReasonStop
		if len(resp1.Candidates) > 0 {
			finishReason = resp1.Candidates[0].FinishReason
		}
		if finishReason != genai.FinishReasonStop && finishReason != genai.FinishReasonUnspecified {
			log.Printf("[Chat] LLM finished with reason: %s", finishReason)
			assistantResponseText = "Извините, я не могу обработать этот запрос из-за ограничений."
		} else {
			assistantResponseText = "Простите, я не смог обработать ваш запрос. Пожалуйста, попробуйте еще раз."
		}
	} else if strings.Contains(strings.ToLower(assistantResponseText), "не найден") ||
		strings.Contains(strings.ToLower(assistantResponseText), "не могу найти") ||
		(functionCallToExecute != nil && assistantResponseText == "Информация по запросу не найдена в базе данных.") {
		log.Println("[Chat] Assistant response indicates no information found.")
		assistantResponseText = "Простите, я не смог найти аптеку по вашему запросу. Пожалуйста, уточните информацию."
	}

	// Sanitize assistantResponseText: allow only letters, numbers, spaces, and common punctuation (.,!?":-)
	re := regexp.MustCompile(`[^\p{L}\p{N}\s.,!?":\-]`)
	assistantResponseText = re.ReplaceAllString(assistantResponseText, "")

	assistantContent := &genai.Content{
		Role:  "model",
		Parts: []*genai.Part{{Text: assistantResponseText}},
	}
	session.History = append(session.History, assistantContent)

	response := map[string]string{
		"transcription":      userQuery,
		"assistant_response": assistantResponseText,
		"session_id":         sessionID,
	}

	log.Printf("[Chat] Final assistant response: %s", assistantResponseText)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[Chat] Error encoding final response: %v", err)
	}
}

func generateSessionID() string {
	return fmt.Sprintf("session_%d_%s", time.Now().Unix(), generateRandomString(8))
}
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[mathrand.Intn(len(charset))]
	}
	return string(b)
}
