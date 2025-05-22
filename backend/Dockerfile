# Stage 1: Build stage
FROM golang:alpine AS build
RUN apk add --no-cache gcc musl-dev
# Set the working directory
WORKDIR /app

# Copy and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the Go application
RUN CGO_ENABLED=1 GOOS=linux go build -o voice_assistant .

# Stage 2: Final stage
FROM alpine:latest

# Set the working directory
WORKDIR /app

# Copy the binary from the build stage
COPY --from=build /app/voice_assistant .
COPY --from=build /app/api.yaml .
COPY --from=build /app/config.yaml .
COPY --from=build /app/db/migration .

# Set the timezone and install CA certificates
RUN apk --no-cache add ca-certificates tzdata

# Set the entrypoint command
CMD ["/app/voice_assistant"]