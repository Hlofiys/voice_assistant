package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	chromago "github.com/amikos-tech/chroma-go/pkg/api/v2"
	g "github.com/amikos-tech/chroma-go/pkg/embeddings/gemini"
	"github.com/google/uuid"
)

type RagDocument struct {
	Text     string                 `json:"text"`
	Metadata map[string]interface{} `json:"metadata"`
}

// cleanMetadata removes or replaces nil values from the metadata map.
func cleanMetadata(metadata map[string]interface{}) map[string]interface{} {
	cleaned := make(map[string]interface{})
	for key, value := range metadata {
		if value == nil {
			// Option 1: Skip nil values (remove the key)
			// continue

			// Option 2: Replace nil with an empty string (or another placeholder)
			cleaned[key] = "" // Or "N/A", "UNKNOWN", etc.
		} else {
			// Ensure nested maps are also handled if they can contain nil
			// For this specific JSONL structure, metadata values are simple types or nil.
			// If you had nested maps, you'd need a recursive cleaning function.
			cleaned[key] = value
		}
	}
	return cleaned
}

func main() {
	// --- CONFIG ---
	jsonlFilePath := "data.jsonl"
	chromaCollectionName := "chatbot-pharmacies"

	// --- INIT ---
	ctx := context.Background()

	ef, err := g.NewGeminiEmbeddingFunction(g.WithEnvAPIKey(), g.WithDefaultModel("text-embedding-004"))
	if err != nil {
		log.Fatalf("Failed to create Gemini embedding function: %v", err)
	}

	chromaClient, err := chromago.NewHTTPClient(chromago.WithBaseURL("http://localhost:8000"))
	if err != nil {
		log.Fatalf("Failed to create Chroma client: %v", err)
	}
	defer func() {
		err = chromaClient.Close()
		if err != nil {
			log.Printf("Error closing Chroma client: %s \n", err)
		}
	}()

	// For testing, consider deleting the collection first if you're making changes
	// existingCollection, _ := chromaClient.GetCollection(ctx, chromaCollectionName, nil)
	// if existingCollection != nil {
	// 	log.Printf("Deleting existing collection '%s' for a clean test run.", chromaCollectionName)
	// 	_, errDel := chromaClient.DeleteCollection(ctx, chromaCollectionName)
	// 	if errDel != nil {
	// 		log.Fatalf("Failed to delete existing collection '%s': %v", chromaCollectionName, errDel)
	// 	}
	// }

	collection, err := chromaClient.GetOrCreateCollection(ctx, chromaCollectionName, chromago.WithEmbeddingFunctionCreate(ef))
	if err != nil {
		log.Fatalf("Failed to get or create ChromaDB collection '%s': %v", chromaCollectionName, err)
	}

	file, err := os.Open(jsonlFilePath)
	if err != nil {
		log.Fatalf("Failed to open JSONL file '%s': %v", jsonlFilePath, err)
	}
	defer file.Close()

	var docIDs []chromago.DocumentID
	var documents []string
	var metadatasFromJSONL []map[string]interface{}

	scanner := bufio.NewScanner(file)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		lineBytes := scanner.Bytes()

		if len(strings.TrimSpace(string(lineBytes))) == 0 {
			continue
		}

		var ragDoc RagDocument
		if err := json.Unmarshal(lineBytes, &ragDoc); err != nil {
			log.Printf("Warning: Failed to unmarshal JSON line %d: %v. Skipping line: %s", lineNumber, err, string(lineBytes))
			continue
		}

		if ragDoc.Text == "" {
			log.Printf("Warning: Document text is empty on line %d. Skipping.", lineNumber)
			continue
		}

		docID := uuid.New().String()
		docIDs = append(docIDs, chromago.DocumentID(docID))
		documents = append(documents, ragDoc.Text)

		if ragDoc.Metadata == nil {
			ragDoc.Metadata = make(map[string]interface{})
		} else {
			// Clean the metadata to handle nil values
			ragDoc.Metadata = cleanMetadata(ragDoc.Metadata)
		}
		metadatasFromJSONL = append(metadatasFromJSONL, ragDoc.Metadata)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error reading JSONL file '%s': %v", jsonlFilePath, err)
	}

	if len(documents) == 0 {
		log.Fatalf("No valid documents were processed from '%s'. Please check the file content and format.", jsonlFilePath)
	}

	fmt.Printf("Prepared %d documents for upload.\n", len(documents))

	var chromagoMetadatas []chromago.DocumentMetadata
	for i, m := range metadatasFromJSONL {
		dm, err := chromago.NewDocumentMetadataFromMap(m)
		if err != nil {
			log.Fatalf("Failed to create document metadata for document %d (ID: %s) from map: %v. Metadata: %+v", i, docIDs[i], err, m)
		}
		chromagoMetadatas = append(chromagoMetadatas, dm)
	}

	fmt.Printf("Attempting to upload %d documents to ChromaDB collection '%s'...\n", len(documents), chromaCollectionName)

	// Batching for large datasets
	batchSize := 100 // Adjust as needed; Chroma's practical limit is often much higher but smaller batches are safer
	totalDocs := len(documents)

	for i := 0; i < totalDocs; i += batchSize {
		end := i + batchSize
		if end > totalDocs {
			end = totalDocs
		}

		batchDocIDs := docIDs[i:end]
		batchDocuments := documents[i:end]
		batchMetadatas := chromagoMetadatas[i:end]

		fmt.Printf("Uploading batch %d to %d of %d...\n", i+1, end, totalDocs)
		err = collection.Add(
			ctx,
			chromago.WithIDs(batchDocIDs...),
			chromago.WithTexts(batchDocuments...),
			chromago.WithMetadatas(batchMetadatas...),
		)
		if err != nil {
			// You might want more sophisticated retry logic or error aggregation here
			log.Fatalf("Failed to upload batch of documents (starting index %d) to ChromaDB: %v", i, err)
		}
	}

	fmt.Printf("Successfully uploaded %d documents to ChromaDB collection '%s'.\n", len(documents), chromaCollectionName)
	fmt.Println("Done uploading all documents to ChromaDB.")
}
