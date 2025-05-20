package util

import (
	"log"

	"github.com/spf13/viper"
)

// Config stores all configuration of the application.
// The values are read by viper from a config file or environment variable.
type Config struct {
	DbDriver                 string `mapstructure:"DB_DRIVER"`
	DbSource                 string `mapstructure:"DB_SOURCE"`
	PostgresUser             string `mapstructure:"POSTGRES_USER"`
	PostgresPassword         string `mapstructure:"POSTGRES_PASSWORD"`
	PostgresDb               string `mapstructure:"POSTGRES_DB"`
	ServerAddress            string `mapstructure:"SERVER_ADDRESS"`
	JwtSecret                string `mapstructure:"JWT_SECRET"`
	JwtIssuer                string `mapstructure:"JWT_ISSUER"`
	JwtAudience              string `mapstructure:"JWT_AUDIENCE"`
	GoogleAPIKey             string `mapstructure:"GOOGLE_API_KEY"`
	ChromaBaseURL            string `mapstructure:"CHROMA_BASE_URL"`
	ChromaCollectionName     string `mapstructure:"CHROMA_COLLECTION_NAME"`
	GoogleEmbeddingModelName string `mapstructure:"GOOGLE_EMBEDDING_MODEL_NAME"`
	GoogleChatModelName      string `mapstructure:"GOOGLE_CHAT_MODEL_NAME"`
}

// LoadConfig reads configuration from file or environment variables.
func LoadConfig(path string) (config Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName("app") // Name of config file (without extension)
	viper.SetConfigType("env") // REQUIRED if the config file does not have the extension in the name

	viper.AutomaticEnv() // Read in environment variables that match

	err = viper.ReadInConfig() // Find and read the config file
	if err != nil {
		// If config file not found, it's okay if all vars are in ENV
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return
		}
		log.Println("Config file not found, relying on environment variables.")
	}

	err = viper.Unmarshal(&config)
	if err != nil {
		return
	}

	// Set defaults if not provided, for critical fields or for easier local dev
	if config.ServerAddress == "" {
		config.ServerAddress = "8080" // Default port
	}
	if config.ChromaBaseURL == "" {
		config.ChromaBaseURL = "http://192.168.1.34:8000"
	}
	if config.ChromaCollectionName == "" {
		config.ChromaCollectionName = "chatbot-collection"
	}
	if config.GoogleEmbeddingModelName == "" {
		config.GoogleEmbeddingModelName = "text-embedding-004"
	}
	if config.GoogleChatModelName == "" {
		config.GoogleChatModelName = "gemini-2.0-flash-lite"
	}

	return
}
