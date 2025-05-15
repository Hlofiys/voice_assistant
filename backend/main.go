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
	"github.com/go-chi/chi/v5"
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

	r := chi.NewRouter()
	validatorOptions := &middleWare.Options{}
	a, err := tools.NewJwsAuthenticator(config)
	if err != nil {
		log.Fatalln("error creating authenticator:", err)
	}
	validatorOptions.Options.AuthenticationFunc = tools.NewAuthenticator(a)
	r.Use(middleWare.OapiRequestValidatorWithOptions(doc, validatorOptions))
	r.Get("/swagger", func(w http.ResponseWriter, r *http.Request) {
		fileBytes, _ := os.ReadFile("api.yaml")
		w.Header().Set("Content-Type", "text")
		_, err := w.Write(fileBytes)
		if err != nil {
			return
		}
	})

	// create a type that satisfies the `api.ServerInterface`, which contains an implementation of every operation from the generated code
	server := api.NewServer(db, *a)

	// get an `http.Handler` that we can use
	h := api.HandlerFromMux(&server, r)

	s := &http.Server{
		Handler: h,
		Addr:    "0.0.0.0:8080",
	}

	// And we serve HTTP until the world ends.
	log.Fatal(s.ListenAndServe())
}
