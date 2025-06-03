package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
)

type Metadata struct {
	City        string `json:"city"`
	Street      string `json:"street"`
	HouseNumber string `json:"house_number"`
}

type Record struct {
	Text     string   `json:"text"`
	Metadata Metadata `json:"metadata"`
}

type NominatimResponse []struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

func geocode(address string) (float64, float64, error) {
	baseURL := "https://nominatim.openstreetmap.org/search"
	params := url.Values{}
	params.Set("q", address)
	params.Set("format", "json")
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	req, _ := http.NewRequest("GET", reqURL, nil)
	req.Header.Set("User-Agent", "pharmacy-geocoder/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result NominatimResponse
	if err := json.Unmarshal(body, &result); err != nil || len(result) == 0 {
		return 0, 0, fmt.Errorf("no geocode result for %s", address)
	}

	var latF, lonF float64
	fmt.Sscanf(result[0].Lat, "%f", &latF)
	fmt.Sscanf(result[0].Lon, "%f", &lonF)
	return latF, lonF, nil
}

func main() {
	ctx := context.Background()
	connStr := "postgres://postgres:postgres@192.168.1.34:5433/assistant?sslmode=disable" // update this!
	conn, err := pgx.Connect(ctx, connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close(ctx)

	file, err := os.Open("data.jsonl")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}

		var rec Record
		if err := json.Unmarshal(line, &rec); err != nil {
			log.Printf("skip line: %v", err)
			continue
		}

		address := fmt.Sprintf("Беларусь, %s, %s, %s", rec.Metadata.City, rec.Metadata.Street, rec.Metadata.HouseNumber)
		lat, lon, err := geocode(address)
		if err != nil {
			log.Printf("geocode error for %s: %v", address, err)
			continue
		}

		_, err = conn.Exec(ctx,
			`INSERT INTO locations (text, location) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326))`,
			rec.Text, lon, lat,
		)
		if err != nil {
			log.Printf("db insert error: %v", err)
			continue
		}
		log.Printf("Inserted: %s [%f, %f]", rec.Text, lat, lon)
		time.Sleep(1100 * time.Millisecond) // be nice to Nominatim API
	}

	if err := scanner.Err(); err != nil {
		log.Fatal(err)
	}
}
