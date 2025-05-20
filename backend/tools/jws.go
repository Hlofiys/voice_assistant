package tools

import (
	"fmt"
	"time"
	"io"
	"crypto/rand"
	"encoding/base64"
	"voice_assistant/util"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Authenticator struct {
	Config util.Config
}

var _ JWSValidator = (*Authenticator)(nil)

// NewJwsAuthenticator creates an authenticator which uses a HMAC key
// to validate and sign JWTs.
func NewJwsAuthenticator(config util.Config) (*Authenticator, error) {
	return &Authenticator{Config: config}, nil
}

// GenerateToken creates a new JWT token with the given permissions and duration
func (f *Authenticator) GenerateToken(userID uuid.UUID) (string, error) {
	now := time.Now()
	tokenDuration := time.Hour * 24 * 30
	claims := jwt.MapClaims{
		"sub":   userID,
		"exp":   now.Add(tokenDuration).Unix(),
		"iat":   now.Unix(),
		"nbf":   now.Unix(),
		"iss":   f.Config.JwtIssuer,
		"aud":   f.Config.JwtAudience,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(f.Config.JwtSecret))
	if err != nil {
		return "", fmt.Errorf("error signing token: %v", err)
	}

	return tokenString, nil
}

func generateSecureRandomString(numBytes int) (string, error) {
	b := make([]byte, numBytes)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", fmt.Errorf("failed to read random bytes: %w", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func (f *Authenticator) GenerateRefreshToken() (string, time.Time, error) {
	numBytes := 60
	refreshToken, err := generateSecureRandomString(numBytes)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to generate secure random string for refresh token: %w", err)
	}

	now := time.Now()
	expiresAt := now.AddDate(0, 1, 0) 

	return refreshToken, expiresAt, nil
}

// ValidateJWS ensures that the critical JWT claims needed to ensure that we
// trust the JWT are present and with the correct values.
func (f *Authenticator) ValidateJWS(jwsString string) (jwt.Token, error) {
	token, err := jwt.Parse(jwsString, func(token *jwt.Token) (any, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return []byte(f.Config.JwtSecret), nil
	})
	if err != nil {
		return jwt.Token{}, fmt.Errorf("error parsing jws token: %v", err)
	}
	return *token, nil
}
