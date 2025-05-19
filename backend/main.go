package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"voice_assistant/api"
	dbCon "voice_assistant/db/sqlc"
	"voice_assistant/tools"
	"voice_assistant/util"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/jackc/pgx/v5"
	middleWare "github.com/oapi-codegen/nethttp-middleware"
)

var db *dbCon.Queries

func main() {
	config, err := util.LoadConfig(".")
	if err != nil {
		log.Fatalf("could not loadconfig: %v", err)
	}

	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = true
	loader.ReadFromURIFunc = func(loader *openapi3.Loader, uri *url.URL) ([]byte, error) {
		return os.ReadFile(uri.Path)
	}

	doc, err := loader.LoadFromFile("api.yaml")
	if err != nil {
		panic(err)
	}

	if err = doc.Validate(loader.Context); err != nil {
		panic(err)
	}

	fmt.Println("API schema loaded and validated successfully...")

	conn, err := pgx.Connect(context.Background(), config.DbSource)
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer func(conn *pgx.Conn, ctx context.Context) {
		err := conn.Close(ctx)
		if err != nil {
			fmt.Println("Error closing connection...")
		}
	}(conn, context.Background())

	db = dbCon.New(conn)

	fmt.Println("PostgreSql connected successfully...")

	// Create JWT authenticator
	authenticator, err := tools.NewJwsAuthenticator(config)
	if err != nil {
		log.Fatalln("error creating authenticator:", err)
	}

	// Standard HTTP server implementation
	httpHandler := http.NewServeMux()

	// Add middleware for OpenAPI validation
	validatorOptions := &middleWare.Options{}
	validatorOptions.Options.AuthenticationFunc = tools.NewAuthenticator(authenticator)

	server := api.NewServer(*authenticator, db)

	validator := middleWare.OapiRequestValidatorWithOptions(doc, validatorOptions)

	handler := api.HandlerFromMux(&server, httpHandler)

	handler = validator(handler)

	// Configure the HTTP server
	s := &http.Server{
		Handler: handler,
		Addr:    "0.0.0.0:8080",
	}

	// Start the server
	log.Printf("Starting server on %s", s.Addr)
	log.Fatal(s.ListenAndServe())
}
