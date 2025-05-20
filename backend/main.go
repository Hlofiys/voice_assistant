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

	chromago "github.com/amikos-tech/chroma-go/pkg/api/v2"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/jackc/pgx/v5"
	middleWare "github.com/oapi-codegen/nethttp-middleware"
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

	// Establish database connection
	ctx := context.Background()

	// httpOptions := genai.HTTPOptions{
	// 	BaseURL: "https://google-proxy.hlofiys.xyz/v1beta",
	// }

	// Create GenAI client
	genaiClient, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  config.GoogleAPIKey,
		Backend: genai.BackendGeminiAPI,
		// HTTPOptions: httpOptions,
	})
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

	server := api.NewServer(*authenticator, genaiClient, chromaClient, config.ChromaCollectionName, db)

	//validator := middleWare.OapiRequestValidatorWithOptions(doc, validatorOptions)

	handler := api.HandlerFromMux(&server, httpHandler)

	//handler = validator(handler)

	// Configure the HTTP server
	s := &http.Server{
		Handler: handler,
		Addr:    "0.0.0.0:8080",
	}

	// Start the server
	log.Printf("Starting server on %s", s.Addr)
	log.Fatal(s.ListenAndServe())
}
