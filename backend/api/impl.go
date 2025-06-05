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
	"strconv"
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
	ID              string
	History         []*genai.Content
	CreatedAt       time.Time
	UpdatedAt       time.Time
	CurrentPharmacy *PharmacyContext // Track current pharmacy context
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
		http.Error(w, `{"message": "Please set a password"}`, http.StatusBadRequest)
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

func validateChatHistory(history []*genai.Content) []*genai.Content {
	var validHistory []*genai.Content
	for _, content := range history {
		if content == nil || len(content.Parts) == 0 {
			continue
		}

		// Only keep text parts, discard others
		var validParts []*genai.Part
		for _, part := range content.Parts {
			if part.Text != "" {
				validParts = append(validParts, &genai.Part{Text: part.Text})
			}
		}

		if len(validParts) > 0 {
			validHistory = append(validHistory, &genai.Content{
				Role:  content.Role,
				Parts: validParts,
			})
		}
	}
	return validHistory
}

// buildSystemPrompt creates the system prompt string with dynamic lat/lon.
func buildSystemPrompt(lat, lon float64, pc *PharmacyContext) string {
	promptText := `
Ты — русскоязычный голосовой ассистент для поиска аптек.

──────────────── 1. Когда вызывать инструмент ────────────────
find_nearest_pharmacy  
• фразы «ближайшая / рядом / поблизости / возле меня / к моему местоположению»  
• в запросе НЕТ других параметров  

find_pharmacies  
• присутствует слово аптека / pharmacy / фарм / лекарство / препарат  
  ИЛИ указан ≥1 параметр (название, номер, город, улица, дом, телефон)  
• вызывай даже по одному параметру  

return_transcription  
• во всех остальных случаях, когда не подходит ни один из вышеуказанных инструментов, обязательно вызывай return_transcription. В transcription всегда только распознанная речь пользователя, а текстовый ответ assistant должен быть обычным, не дублируя транскрипцию.

иначе — коротко попроси уточнение  

──────────────── 2. Как вызывать ────────────────
Когда нужен инструмент, assistant-сообщение = только functionCall без текста.  

──────────────── 3. После ответа инструмента ────────────────
Отвечай гибко и естественно, как человек. Адаптируйся к запросу пользователя.
Номера телефонов возвращай в формате +375 (XX) XXX-XX-XX.

find_nearest_pharmacy (возвращает аптеки) →  
• если пользователь просит все аптеки, перечисли их в формате нумерованного списка:
1. Аптека [название] номер [номер], [адрес], телефон [телефон]
2. Аптека [название] номер [номер], [адрес], телефон [телефон]
3. Аптека [название] номер [номер], [адрес], телефон [телефон]

• если пользователь просит первую/любую аптеку, сообщи только о ней:
"Ближайшая аптека [название] номер [номер]. [адрес]. Телефон: [телефон]."

• если пользователь не уточняет, предложи до 3 аптек:
"Ближайшие аптеки:
1. [название], [адрес]
2. [название], [адрес]
3. [название], [адрес]"

find_pharmacies →  
• 1 аптека → "Аптека [название] номер [номер]. [город] [улица] дом [дом]. Телефон: [телефон]."  
• >1 аптек и пользователь просит все → перечисли в формате нумерованного списка (максимум 3)
• >1 аптек и пользователь не уточняет → спроси один уточняющий параметр или предложи список из 3 подходящих аптек  
• 0 аптек → "Извините, аптека не найдена. Уточните параметры."  

Формат нумерованных списков: каждый пункт с новой строки, с цифрой и точкой.

──────────────── 4. Строго запрещено ────────────────
• Выдумывать или изменять данные аптек.  
  Данные адреса/телефона/названия/номера МОЖНО произносить ТОЛЬКО если они пришли в FunctionResponse от инструмента.  
• Выводить необработанную транскрипцию.  
• Писать "вызываю инструмент…".  
• Показывать >3 аптек за один ответ.  
• Смешивать данные разных аптек.  

Если достоверных данных нет → спроси уточнение или извинись, но не придумывай.  

──────────────── 5. Память ────────────────
Новый идентификатор (название/номер/адрес) = новая сессия; без идентификатора можешь опираться на предыдущую.  

Координаты пользователя: LAT={{LAT}}, LON={{LON}}`
	promptText = strings.ReplaceAll(promptText, "{{LAT}}", fmt.Sprintf("%.6f", lat)) // Using %.6f for precision
	promptText = strings.ReplaceAll(promptText, "{{LON}}", fmt.Sprintf("%.6f", lon))
	m := ""
	if pc != nil {
		m = fmt.Sprintf(`
────────────── Текущий контекст (slot-memory) ──────────────
название: %s
номер:     %s
город:     %s
улица:     %s
дом:       %s
`, pc.Name, pc.Number, pc.City, pc.Street, pc.House)
	}
	return promptText + m
}

func (s *Server) getOrCreateSession(sessionID string) *ChatSession {
	s.sessionMutex.Lock()
	defer s.sessionMutex.Unlock()

	if session, ok := s.chatSessions[sessionID]; ok {
		session.UpdatedAt = time.Now()
		if time.Since(session.CreatedAt) > 15*time.Minute {
			session.History = nil
			session.CreatedAt = time.Now()
		}
		return session
	}

	session := &ChatSession{
		ID:              sessionID,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		CurrentPharmacy: nil,
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

// Add this struct to track pharmacy context
type PharmacyContext struct {
	Name   string
	Number string
	City   string
	Street string
	House  string
}

// Add this helper function to detect if user is asking about a different pharmacy
func (s *Server) isNewPharmacyQuery(current *PharmacyContext, extracted ExtractedQueryParams) bool {
	if current == nil {
		return true
	}

	// If user provides any new specific identifier, it's likely a new query
	if extracted.PharmacyName != "" && extracted.PharmacyName != current.Name {
		return true
	}
	if extracted.PharmacyNumber != "" && extracted.PharmacyNumber != current.Number {
		return true
	}
	// If user provides a completely different address
	if extracted.City != "" && extracted.City != current.City {
		return true
	}
	if extracted.Street != "" && extracted.Street != current.Street &&
		(extracted.City != "" || extracted.HouseNumber != "") {
		return true
	}

	return false
}

// Add this helper to merge context for follow-up questions
func (s *Server) mergePharmacyContext(current *PharmacyContext, extracted ExtractedQueryParams) ExtractedQueryParams {
	merged := extracted

	// Only merge if we're continuing the same pharmacy conversation
	if current != nil {
		if merged.PharmacyName == "" {
			merged.PharmacyName = current.Name
		}
		if merged.PharmacyNumber == "" {
			merged.PharmacyNumber = current.Number
		}
		if merged.City == "" {
			merged.City = current.City
		}
		if merged.Street == "" {
			merged.Street = current.Street
		}
		if merged.HouseNumber == "" {
			merged.HouseNumber = current.House
		}
	}

	return merged
}

// ---------------------------------------

func (s *Server) Chat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		log.Printf("[Chat] multipart parse error: %v", err)
		http.Error(w, `{"message":"invalid multipart form"}`, http.StatusBadRequest)
		return
	}

	// --------------- 1. GEO COORDINATES ----------------
	latStr := r.FormValue("latitude")
	lonStr := r.FormValue("longitude")

	var userLat, userLon float64
	if latStr != "" && lonStr != "" {
		var errLat, errLon error
		userLat, errLat = strconv.ParseFloat(latStr, 64)
		userLon, errLon = strconv.ParseFloat(lonStr, 64)
		if errLat != nil || errLon != nil {
			log.Printf("[Chat] bad lat/lon: %s %s", latStr, lonStr)
			http.Error(w, `{"message":"invalid latitude or longitude"}`, http.StatusBadRequest)
			return
		}
	}

	// --------------- 2. SESSION HANDLING ---------------
	sessionID := r.FormValue("session_id")
	if sessionID == "" {
		sessionID = generateSessionID()
	}
	session := s.getOrCreateSession(sessionID)

	// --------------- 3. AUDIO FILE ----------------------
	audioFile, fileHeader, err := r.FormFile("audio")
	if err != nil {
		log.Printf("[Chat] audio file error: %v", err)
		http.Error(w, `{"message":"audio file is required"}`, http.StatusBadRequest)
		return
	}
	defer audioFile.Close()

	audioBytes, err := io.ReadAll(audioFile)
	if err != nil {
		log.Printf("[Chat] audio read error: %v", err)
		http.Error(w, `{"message":"failed to read audio"}`, http.StatusInternalServerError)
		return
	}
	audioBlob := genai.Blob{MIMEType: fileHeader.Header.Get("Content-Type"), Data: audioBytes}
	audioDataPart := genai.Part{InlineData: &audioBlob}

	// Define the tool
	findPharmacyTool := &genai.Tool{
		FunctionDeclarations: []*genai.FunctionDeclaration{{
			Name:        "find_pharmacies",
			Description: "Searches for pharmacies based on user query and extracted criteria like name, number, city, street, and house number. Also requires the full transcription of the user's audio query.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"user_query_transcription": {Type: genai.TypeString, Description: "The full transcribed text of the user's audio query. This field is mandatory."},
					"pharmacy_name":            {Type: genai.TypeString, Description: "Name of the pharmacy from current query only. Optional."},
					"pharmacy_number":          {Type: genai.TypeString, Description: "Number of the pharmacy from current query only. Optional."},
					"city":                     {Type: genai.TypeString, Description: "City name from current query only. Optional."},
					"street":                   {Type: genai.TypeString, Description: "Street name from current query only. Optional."},
					"house_number":             {Type: genai.TypeString, Description: "House number from current query only. Optional."},
				},
				Required: []string{"user_query_transcription"},
			},
		}},
	}

	findNearestTool := &genai.Tool{
		FunctionDeclarations: []*genai.FunctionDeclaration{{
			Name:        "find_nearest_pharmacy",
			Description: "Returns the three closest pharmacies to the user's coordinates.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"user_query_transcription": {Type: genai.TypeString, Description: "The full transcribed text of the user's audio query. This field is mandatory."},
					"latitude":                 {Type: genai.TypeNumber, Description: "Latitude of the user's location. Mandatory."},
					"longitude":                {Type: genai.TypeNumber, Description: "Longitude of the user's location. Mandatory."},
				},
				Required: []string{"user_query_transcription", "latitude", "longitude"},
			},
		}},
	}

	returnTranscriptionTool := &genai.Tool{
		FunctionDeclarations: []*genai.FunctionDeclaration{{
			Name:        "return_transcription",
			Description: "Accepts the transcription of the user's audio query.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"user_query_transcription": {Type: genai.TypeString, Description: "The full transcribed text of the user's audio query. This field is mandatory."},
				},
				Required: []string{"user_query_transcription"},
			},
		}},
	}

	chatConfig := &genai.GenerateContentConfig{
		Tools: []*genai.Tool{findPharmacyTool, findNearestTool, returnTranscriptionTool},
		ToolConfig: &genai.ToolConfig{
			FunctionCallingConfig: &genai.FunctionCallingConfig{
				Mode: genai.FunctionCallingConfigModeAuto,
			},
		},
		SystemInstruction: &genai.Content{Parts: []*genai.Part{{Text: buildSystemPrompt(userLat, userLon, session.CurrentPharmacy)}}},
	}

	// --------------- 6. HISTORY MANAGEMENT --------------
	chatSession, err := s.genaiClient.Chats.Create(ctx, s.chatModel, chatConfig, validateChatHistory(session.History))

	if err != nil {
		log.Printf("[Chat] LLM session error: %v", err)
		http.Error(w, `{"message":"failed to init AI chat"}`, http.StatusInternalServerError)
		return
	}

	log.Println("[Chat] LLM round 1…")
	resp1, err := chatSession.SendMessage(ctx, audioDataPart)
	if err != nil {
		log.Printf("[Chat] LLM round-1 error: %v", err)
		http.Error(w, `{"message":"audio processing failed"}`, http.StatusInternalServerError)
		return
	}

	// --------------- 7. PARSE FIRST LLM REPLY -----------
	var (
		userQuery               string
		extractedParamsFromTool ExtractedQueryParams
		functionCallToExecute   *genai.FunctionCall
		assistantResponseText   string
	)

	if resp1 != nil && len(resp1.Candidates) > 0 && resp1.Candidates[0].Content != nil {
		for _, p := range resp1.Candidates[0].Content.Parts {
			if p.FunctionCall != nil {
				functionCallToExecute = p.FunctionCall
				break
			}
		}
	}

	resolved := false

	// --------------- 8. TOOL EXECUTION SWITCH ----------
	switch {
	// ------- find_pharmacies ---------------------------
	case functionCallToExecute != nil && functionCallToExecute.Name == "find_pharmacies":
		log.Println("[Chat] LLM round 1 - tool: find_pharmacies")
		args := functionCallToExecute.Args
		if t, ok := args["user_query_transcription"].(string); ok {
			userQuery = t
		}
		if v, ok := args["pharmacy_name"].(string); ok {
			extractedParamsFromTool.PharmacyName = v
		}
		if v, ok := args["pharmacy_number"].(string); ok {
			extractedParamsFromTool.PharmacyNumber = v
		}
		if v, ok := args["city"].(string); ok {
			extractedParamsFromTool.City = v
		}
		if v, ok := args["street"].(string); ok {
			extractedParamsFromTool.Street = v
		}
		if v, ok := args["house_number"].(string); ok {
			extractedParamsFromTool.HouseNumber = v
		}

		// context merge / reset
		if s.isNewPharmacyQuery(session.CurrentPharmacy, extractedParamsFromTool) {
			session.CurrentPharmacy = &PharmacyContext{
				Name:   extractedParamsFromTool.PharmacyName,
				Number: extractedParamsFromTool.PharmacyNumber,
				City:   extractedParamsFromTool.City,
				Street: extractedParamsFromTool.Street,
				House:  extractedParamsFromTool.HouseNumber,
			}
		} else {
			extractedParamsFromTool = s.mergePharmacyContext(session.CurrentPharmacy, extractedParamsFromTool)
		}

		// ---------- Chroma vector search (same as before) ----------
		collection, err := s.chromaDBClient.GetCollection(ctx, s.chromaCollectionName, chromago.WithEmbeddingFunctionGet(s.ef))
		if err != nil {
			log.Printf("[Chat] Chroma collection error: %v", err)
			http.Error(w, `{"message":"pharmacy DB access failed"}`, http.StatusInternalServerError)
			return
		}

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

		log.Printf("[Chat] RAG Context for LLM (call 1): %s", queryTextBuilder.String())

		queryOpts := []chromago.CollectionQueryOption{
			chromago.WithQueryTexts(strings.TrimSpace(queryTextBuilder.String())),
			chromago.WithNResults(10),
		}
		if len(strictClauses) > 0 {
			filter := strictClauses[0]
			if len(strictClauses) > 1 {
				filter = chromago.And(strictClauses...)
			}
			queryOpts = append(queryOpts, chromago.WithWhereQuery(filter))
		}
		queryOpts = append(queryOpts, chromago.WithIncludeQuery(chromago.IncludeDocuments, chromago.IncludeMetadatas))

		retrieved, err := collection.Query(ctx, queryOpts...)
		if err != nil {
			log.Printf("[Chat] Chroma query error: %v", err)
			http.Error(w, `{"message":"pharmacy query failed"}`, http.StatusInternalServerError)
			return
		}

		// fallback OR search if strict no-hit
		if len(retrieved.GetDocumentsGroups()[0]) == 0 {
			var orClauses []chromago.WhereClause
			if ep.PharmacyName != "" {
				orClauses = append(orClauses, chromago.EqString("pharmacy_name", ep.PharmacyName))
			}
			if ep.PharmacyNumber != "" {
				orClauses = append(orClauses, chromago.EqString("pharmacy_number", ep.PharmacyNumber))
			}
			if ep.City != "" {
				orClauses = append(orClauses, chromago.EqString("city", ep.City))
			}
			if ep.Street != "" {
				orClauses = append(orClauses, chromago.EqString("street", ep.Street))
			}
			if ep.HouseNumber != "" {
				orClauses = append(orClauses, chromago.EqString("house_number", ep.HouseNumber))
			}

			fallbackOpts := []chromago.CollectionQueryOption{
				chromago.WithQueryTexts(strings.TrimSpace(queryTextBuilder.String())),
				chromago.WithNResults(10),
				chromago.WithIncludeQuery(chromago.IncludeDocuments, chromago.IncludeMetadatas),
			}
			if len(orClauses) > 0 {
				fallbackOpts = append(fallbackOpts, chromago.WithWhereQuery(chromago.Or(orClauses...)))
			}
			retrieved, err = collection.Query(ctx, fallbackOpts...)
			if err != nil {
				log.Printf("[Chat] Chroma fallback error: %v", err)
				http.Error(w, `{"message":"pharmacy query fallback failed"}`, http.StatusInternalServerError)
				return
			}
		}

		// post-filter fuzzy
		var finalDocs []chromago.Document
		dg := retrieved.GetDocumentsGroups()
		mg := retrieved.GetMetadatasGroups()
		for gi, metas := range mg {
			docs := dg[gi]
			for di, meta := range metas {
				ok := true
				if ep.PharmacyName != "" {
					val, _ := meta.GetString("pharmacy_name")
					ok = ok && fuzzyEqual(val, ep.PharmacyName, 4)
				}
				if ok && ep.PharmacyNumber != "" {
					val, _ := meta.GetString("pharmacy_number")
					ok = ok && fuzzyEqual(val, ep.PharmacyNumber, 1)
				}
				if ok && ep.City != "" {
					val, _ := meta.GetString("city")
					ok = ok && fuzzyEqual(val, ep.City, 2)
				}
				if ok && ep.Street != "" {
					val, _ := meta.GetString("street")
					ok = ok && fuzzyEqual(val, ep.Street, 2)
				}
				if ok && ep.HouseNumber != "" {
					val, _ := meta.GetString("house_number")
					ok = ok && fuzzyEqual(val, ep.HouseNumber, 1)
				}
				if ok {
					finalDocs = append(finalDocs, docs[di])
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
				}
			}
		}

		resolved = len(finalDocs) == 1

		log.Printf("[Chat] RAG Context for LLM (call 2): %s", rag.String())

		fnResp := genai.FunctionResponse{
			Name:     "find_pharmacies",
			Response: map[string]any{"search_results_summary": rag.String()},
		}
		toolPart := genai.Part{FunctionResponse: &fnResp}

		log.Println("[Chat] LLM round 2 (find_pharmacies)…")
		resp2, err := chatSession.SendMessage(ctx, toolPart)
		if err != nil {
			log.Printf("[Chat] LLM round-2 error: %v", err)
			http.Error(w, `{"message":"final answer failed"}`, http.StatusInternalServerError)
			return
		}
		assistantResponseText = resp2.Text()

		// ------- find_nearest_pharmacy ---------------------
	case functionCallToExecute != nil && functionCallToExecute.Name == "find_nearest_pharmacy":
		log.Println("[Chat] LLM round 1 - tool: find_nearest_pharmacy")

		if userLat == 0 && userLon == 0 {
			assistantResponseText = "Координаты не переданы. Невозможно найти ближайшую аптеку."
			break
		}

		getNearestPharmacy := &db.GetNearestPharmacyParams{
			StMakepoint:   userLon,
			StMakepoint_2: userLat,
		}

		nearestList, err := s.db.GetNearestPharmacy(ctx, *getNearestPharmacy)
		if err != nil {
			log.Printf("[Chat] nearest query error: %v", err)
			http.Error(w, `{"message":"nearest pharmacy search failed"}`, http.StatusInternalServerError)
			return
		}
		if len(nearestList) == 0 {
			assistantResponseText = "Извините. аптека поблизости не найдена."
			break
		}

		var summary strings.Builder
		summary.WriteString("Ближайшие аптеки(в своём ответе пиши каждую с новой строки):\n")
		for i, p := range nearestList {
			if i > 0 {
				summary.WriteString("\n")
			}
			summary.WriteString(
				p.Text,
			)
		}

		fnResp := genai.FunctionResponse{
			Name: "find_nearest_pharmacy",
			Response: map[string]any{
				"search_results_summary": summary.String(),
			},
		}
		toolPart := genai.Part{FunctionResponse: &fnResp}

		log.Println("[Chat] LLM round 2 (nearest)…")
		resp2, err := chatSession.SendMessage(ctx, toolPart)
		if err != nil {
			log.Printf("[Chat] LLM round-2 nearest error: %v", err)
			http.Error(w, `{"message":"final nearest answer failed"}`, http.StatusInternalServerError)
			return
		}
		assistantResponseText = resp2.Text()
		resolved = true

	// ------- return_transcription -----------------------
	case functionCallToExecute != nil && functionCallToExecute.Name == "return_transcription":
		log.Println("[Chat] LLM round 1 - tool: return_transcription")
		args := functionCallToExecute.Args
		if t, ok := args["user_query_transcription"].(string); ok {
			userQuery = t
		}
		assistantResponseText = resp1.Text()

	// ------- no tool -----------------------------------
	default:
		log.Println("[Chat] LLM round 1 - no tool")
		resolved = true
		assistantResponseText = resp1.Text()
	}

	// --------------- 9. POST-PROCESS --------------------
	if assistantResponseText == "" {
		assistantResponseText = "Простите, я не смог обработать ваш запрос."
	}
	re := regexp.MustCompile(`[^\p{L}\p{N}\s.,!?":\-]`)
	assistantResponseText = re.ReplaceAllString(assistantResponseText, "")

	// --------------- 10. HISTORY ------------------------
	if resolved {
		session.History = nil
		session.CurrentPharmacy = nil
	} else {
		session.History = append(session.History,
			&genai.Content{Role: "user", Parts: []*genai.Part{{Text: userQuery}}},
			&genai.Content{Role: "model", Parts: []*genai.Part{{Text: assistantResponseText}}},
		)
		if len(session.History) > 8 {
			session.History = session.History[len(session.History)-8:]
		}
	}

	// --------------- 11. RESPONSE -----------------------
	resp := map[string]string{
		"transcription":      userQuery,
		"assistant_response": assistantResponseText,
		"session_id":         sessionID,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
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
