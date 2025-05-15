package api

import (
	"net/http"
	"voice_assistant/tools"
)

var _ ServerInterface = (*Server)(nil)

type Server struct {
	jwtAuth tools.Authenticator
}

// GetCurrentUser implements ServerInterface.
func (s *Server) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	panic("unimplemented")
}

// Login implements ServerInterface.
func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	panic("unimplemented")
}

func NewServer(jwtAuth tools.Authenticator) Server {
	return Server{jwtAuth: jwtAuth}
}
