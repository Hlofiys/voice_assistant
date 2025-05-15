package tools

import (
	"fmt"
	"voice_assistant/util"

	"github.com/golang-jwt/jwt/v5"
)

type Authenticator struct {
	Config util.Config
}

var _ JWSValidator = (*Authenticator)(nil)

// NewJwsAuthenticator creates an authenticator example which uses a hard coded
// ECDSA key to validate JWT's that it has signed itself.
func NewJwsAuthenticator(config util.Config) (*Authenticator, error) {
	return &Authenticator{Config: config}, nil
}

// ValidateJWS ensures that the critical JWT claims needed to ensure that we
// trust the JWT are present and with the correct values.
func (f *Authenticator) ValidateJWS(jwsString string) (jwt.Token, error) {
	token, err := jwt.Parse(jwsString, func(token *jwt.Token) (interface{}, error) {
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
