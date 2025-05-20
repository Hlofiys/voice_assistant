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

func NewServer(jwtAuth tools.Authenticator, db *db.Queries) Server {
	return Server{jwtAuth: jwtAuth, db: db}
}

func (s *Server) ConfirmEmail(w http.ResponseWriter, r *http.Request) {
	panic("ConfirmEmail endpoint not implemented yet.")
}

func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	panic("Login endpoint not implemented yet.")
}

func (s *Server) Logout(w http.ResponseWriter, r *http.Request) {
	panic("Logout endpoint not implemented yet.")
}

func (s *Server) Register(w http.ResponseWriter, r *http.Request) {
	panic("Register endpoint not implemented yet.")
}

func (s *Server) ValidateToken(w http.ResponseWriter, r *http.Request) {
	panic("Validate token endpoint not implemented yet.")
}
