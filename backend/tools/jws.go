package tools

import (
	"fmt"
	"time"
	"voice_assistant/util"

	"github.com/golang-jwt/jwt/v5"
)

const (
	PermissionsClaim = "perms"
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
func (f *Authenticator) GenerateToken(userID string, permissions []string, duration time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   userID,
		"exp":   now.Add(duration).Unix(),
		"iat":   now.Unix(),
		"nbf":   now.Unix(),
		"iss":   f.Config.JwtIssuer,
		"aud":   f.Config.JwtAudience,
		"perms": permissions,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(f.Config.JwtSecret))
	if err != nil {
		return "", fmt.Errorf("error signing token: %v", err)
	}

	return tokenString, nil
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
