package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	chromago "github.com/amikos-tech/chroma-go/pkg/api/v2"
	g "github.com/amikos-tech/chroma-go/pkg/embeddings/gemini"
	"github.com/google/uuid"
)

func main() {
	// --- CONFIG ---
	textFilePath := "data.txt"                   // Path to your text file
	chromaCollectionName := "chatbot-collection" // Your ChromaDB collection name

	// --- INIT ---
	ctx := context.Background()

	// Create Gemini embedding function (uses env var for API key)
	ef, err := g.NewGeminiEmbeddingFunction(g.WithEnvAPIKey(), g.WithDefaultModel("text-embedding-004"))
	if err != nil {
		log.Fatalf("Failed to create Gemini embedding function: %v", err)
	}

	// Create Chroma client
	chromaClient, err := chromago.NewHTTPClient(chromago.WithBaseURL("http://localhost:8000"))
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

	// Get or create collection
	collection, err := chromaClient.GetOrCreateCollection(ctx, chromaCollectionName, chromago.WithEmbeddingFunctionCreate(ef))
	if err != nil {
		log.Fatalf("Failed to get or create ChromaDB collection: %v", err)
	}

	// --- READ & CHUNK TEXT ---
	file, err := os.Open(textFilePath)
	if err != nil {
		log.Fatalf("Failed to open text file: %v", err)
	}
	defer file.Close()

	var chunks []string
	scanner := bufio.NewScanner(file)
	var chunkBuilder strings.Builder
	const chunkSize = 1000 // characters per chunk

	for scanner.Scan() {
		line := scanner.Text()
		if chunkBuilder.Len()+len(line)+1 > chunkSize {
			chunks = append(chunks, chunkBuilder.String())
			chunkBuilder.Reset()
		}
		chunkBuilder.WriteString(line)
		chunkBuilder.WriteString("\n")
	}
	if chunkBuilder.Len() > 0 {
		chunks = append(chunks, chunkBuilder.String())
	}
	if err := scanner.Err(); err != nil {
		log.Fatalf("Error reading file: %v", err)
	}

	// --- UPLOAD TO CHROMA ---
	var docIDs []chromago.DocumentID
	var documents []string
	var metadatasMap []map[string]interface{} // Renamed to avoid confusion
	for i, chunk := range chunks {
		docID := uuid.New().String()
		docIDs = append(docIDs, chromago.DocumentID(docID))
		documents = append(documents, chunk)
		metadatasMap = append(metadatasMap, map[string]interface{}{
			"source": textFilePath,
			"chunk":  i,
		})
	}

	// Convert []map[string]interface{} to []chromago.DocumentMetadata
	var chromagoMetadatas []chromago.DocumentMetadata
	for _, m := range metadatasMap {
		dm, err := chromago.NewDocumentMetadataFromMap(m)
		if err != nil {
			log.Fatalf("Failed to create document metadata from map: %v", err)
		}
		chromagoMetadatas = append(chromagoMetadatas, dm)
	}

	err = collection.Add(
		ctx,
		chromago.WithIDs(docIDs...),      // Corrected: added ...
		chromago.WithTexts(documents...), // Corrected: added ...
		chromago.WithMetadatas(chromagoMetadatas...), // Corrected: use converted slice and added ...
	)
	if err != nil {
		log.Fatalf("Failed to upload documents: %v", err)
	}

	fmt.Printf("Uploaded %d documents to ChromaDB.\n", len(documents))
	fmt.Println("Done uploading all documents to ChromaDB.")
}
