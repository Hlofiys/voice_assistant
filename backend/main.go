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

	"github.com/golang-migrate/migrate/v4"
	pgxv5 "github.com/golang-migrate/migrate/v4/database/pgx"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	chromago "github.com/amikos-tech/chroma-go/pkg/api/v2"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	genaiembs "github.com/google/generative-ai-go/genai"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	middleWare "github.com/oapi-codegen/nethttp-middleware"
	"google.golang.org/api/option"
	"google.golang.org/genai"
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

	doc.Servers = nil

	fmt.Println("API schema loaded and validated successfully...")

	log.Printf("Connecting to PostgreSQL database at %s\n", config.DbSource)

	conn, err := pgxpool.New(context.Background(), config.DbSource)
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer func(conn *pgxpool.Pool) {
		conn.Close()
	}(conn)

	db = dbCon.New(conn)

	fmt.Println("PostgreSql connected successfully...")

	driver, err := pgxv5.WithInstance(stdlib.OpenDBFromPool(conn), &pgxv5.Config{})
	if err != nil {
		log.Fatalf("Failed to create database driver: %v", err)
	}
	// Run database migrations
	m, err := migrate.NewWithDatabaseInstance(
		"file://db/migration",
		"postgres",
		driver,
	)
	if err != nil {
		log.Fatalf("Failed to create migration instance: %v", err)
	}
	if err = m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Failed to apply migrations: %v", err)
	}
	fmt.Println("Database migrations applied successfully...")

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

	// Establish database connection
	ctx := context.Background()
	geminiBaseURL := "https://google-proxy.hlofiys.xyz/"

	httpOptions := genai.HTTPOptions{
		BaseURL: geminiBaseURL,
	}

	// Create GenAI client
	genaiClient, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:      config.GoogleAPIKey,
		HTTPOptions: httpOptions,
	})
	if err != nil {
		log.Fatalf("Failed to create GenAI client: %v", err)
	}

	// Create GenAIEmbs client
	genaiClientEmbs, err := genaiembs.NewClient(ctx,
		option.WithAPIKey(config.GoogleAPIKey),
		option.WithEndpoint(geminiBaseURL),
	)
	if err != nil {
		log.Fatalf("Failed to create GenAI client: %v", err)
	}

	// Create Chroma client
	chromaClient, err := chromago.NewHTTPClient(chromago.WithBaseURL(config.ChromaBaseURL))
	if err != nil {
		log.Fatalf("Failed to create Chroma client: %v", err)
	}
	// Close the client to release any resources such as local embedding functions
	defer func() {
		err = chromaClient.Close()
		if err != nil {
			log.Fatalf("Error closing client: %s \n", err)
		}
	}()

	server := api.NewServer(*authenticator, genaiClient, genaiClientEmbs, chromaClient, config.ChromaCollectionName, db)

	openapi3filter.RegisterBodyDecoder("audio/mp4", openapi3filter.FileBodyDecoder)
	openapi3filter.RegisterBodyDecoder("audio/x-m4a", openapi3filter.FileBodyDecoder)
	validator := middleWare.OapiRequestValidatorWithOptions(doc, validatorOptions)

	handler := api.HandlerFromMux(server, httpHandler)

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
