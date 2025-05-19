package api

import (
	"net/http"
	db "voice_assistant/db/sqlc"
	"voice_assistant/tools"
)

var _ ServerInterface = (*Server)(nil)

type Server struct {
	jwtAuth tools.Authenticator
	db      *db.Queries
}

// GetCurrentUser implements ServerInterface.
func (s *Server) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	panic("unimplemented")
}

// Login implements ServerInterface.
func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	panic("unimplemented")
}

func NewServer(jwtAuth tools.Authenticator, db *db.Queries) Server {
	return Server{jwtAuth: jwtAuth, db: db}
}
