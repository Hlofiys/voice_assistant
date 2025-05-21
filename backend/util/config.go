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
	viper.SetConfigName("config") // Name of config file (without extension)
	viper.SetConfigType("yaml")

	viper.AutomaticEnv() // Read in environment variables that match

	// Read config file if present
	if err = viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return
		}
		log.Println("Config file not found, relying on environment variables and defaults.")
	}

	err = viper.Unmarshal(&config)
	if err != nil {
		return
	}

	// Always load sensitive fields from environment variables
	config.JwtSecret = viper.GetString("JWT_SECRET")
	config.GoogleAPIKey = viper.GetString("GOOGLE_API_KEY")

	return
}
