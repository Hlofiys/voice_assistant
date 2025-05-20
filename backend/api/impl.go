package api

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	db "voice_assistant/db/sqlc"
	"voice_assistant/tools"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

var _ ServerInterface = (*Server)(nil)

type Server struct {
	jwtAuth tools.Authenticator
	db      *db.Queries
}

func NewServer(jwtAuth tools.Authenticator, db *db.Queries) Server {
	return Server{jwtAuth: jwtAuth, db: db}
}

func (s *Server) ConfirmEmail(w http.ResponseWriter, r *http.Request) {
	bodyBytes,err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("Error reading request body: %v", err)
		return
	}

	var confirmEmailRequest *ConfirmEmailRequest
	err = json.Unmarshal(bodyBytes,&confirmEmailRequest)
	
	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("Error unmarshalling request body: %v", err)
		return
	}

	if confirmEmailRequest.Email == "" || confirmEmailRequest.Code == "" {
		http.Error(w, `{"message": "email and code are required"}`, http.StatusBadRequest)
		return
	}

	refreshTokenString, refreshTokenExpiresAt, err := s.jwtAuth.GenerateRefreshToken()
	if err != nil {
		http.Error(w, `{"message": "failed to generate refresh token"}`, http.StatusInternalServerError)
		log.Printf("Error generating refresh token for user : %v", err)
		return
	}
	updateCodeByIdParams := db.UpdateCodeByIdParams{
		Email: confirmEmailRequest.Email,
		Code: pgtype.Text{String: confirmEmailRequest.Code,Valid: true},
		RefreshToken: pgtype.Text{String: refreshTokenString, Valid: true},
		ExpiredAt: pgtype.Timestamp{Time: refreshTokenExpiresAt, Valid: true},
	}

	pgUserID,err := s.db.UpdateCodeById(r.Context(),updateCodeByIdParams)
	if err !=nil {
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
		log.Printf("Error generating access token: %v", err)
		return
	}

	response := ConfirmEmailResponse{
		Token:        accessToken,     
		RefreshToken: refreshTokenString, 
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding success response: %v", err)
	}
}

func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	panic("Login endpoint not implemented yet.")
}

func (s *Server) Logout(w http.ResponseWriter, r *http.Request) {
	userIDFromToken, ok := r.Context().Value(tools.UserIDContextKey).(string)
	if !ok || userIDFromToken == "" {
		log.Println("UserID not found in context. Auth middleware might not have run or token is problematic.")
		http.Error(w, `{"message": "Unauthorized: User identification not found"}`, http.StatusUnauthorized)
		return
	}

	parsedUUID, err := uuid.Parse(userIDFromToken)
	if err != nil {
		log.Printf("UserID '%s' from token is not a valid UUID format: %v", userIDFromToken, err)
		http.Error(w, `{"message": "Unauthorized: Invalid user identification format in token"}`, http.StatusUnauthorized)
		return
	}

	pgUserIDToLogout := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	err = s.db.LogoutById(r.Context(), pgUserIDToLogout)
	if err != nil {
		log.Printf("Database error while invalidating refresh token for UserID '%s': %v", userIDFromToken, err)
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
	bodyBytes,err := io.ReadAll(r.Body)
	defer func() { _ = r.Body.Close() }()
	if err != nil {
		http.Error(w, `{"message": "could not read request body"}`, http.StatusBadRequest)
		log.Printf("Error reading request body: %v", err)
		return
	}

	var registerRequest *RegisterRequest
	err = json.Unmarshal(bodyBytes, &registerRequest)

	if err != nil {
		http.Error(w, `{"message": "could not bind request body: `+err.Error()+`"}`, http.StatusBadRequest)
		log.Printf("Error unmarshalling request body: %v", err)
		return
	}

	if registerRequest.Email == "" || registerRequest.Password == "" {
		http.Error(w, `{"message": "email and password are required"}`, http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(registerRequest.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"message": "failed to hash password"}`, http.StatusInternalServerError)
		log.Printf("Error hashing password: %v", err)
		return
	}

	userID, err := uuid.NewRandom()
	if err != nil {
		http.Error(w, `{"message": "failed to generate user ID"}`, http.StatusInternalServerError)
		log.Printf("Error generating userID: %v", err)
		return
	}

	confirmationCode, err := generateNumericCode(6)
	if err != nil {
		http.Error(w, `{"message": "failed to generate confirmation code"}`, http.StatusInternalServerError)
		log.Printf("Error generating confirmation code: %v", err)
		return
	}

	createUserParams := db.CreateUserParams{
		UserID:       pgtype.UUID{Bytes: userID, Valid: true},
		Email:        registerRequest.Email,
		Password:     string(hashedPassword),
		Code:         pgtype.Text{String: confirmationCode, Valid: true}, 
	}

	err = s.db.CreateUser(r.Context(), createUserParams)
	if err != nil {
		http.Error(w, `{"message": "failed to register user"}`, http.StatusInternalServerError)
		log.Printf("Error creating user in DB: %v", err)
		return
	}

	response := RegisterResponse{
		Message: "Registration successful. Please check your email to verify your account.",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding success response: %v", err)
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
