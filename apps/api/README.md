# MR Training API

Go backend service built with Fiber, following Clean Architecture patterns.

## Quick Start

```bash
# Install dependencies
go mod tidy

# Run locally
go run ./cmd/api

# Run tests
go test ./...

# Build
go build -o bin/api ./cmd/api
```

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp config/.env.example .env
```

## Docker

```bash
# Development with hot reload
docker compose -f docker-compose.dev.yml up

# Production build
docker build -t mr-training-api .
docker run -p 8080:8080 mr-training-api
```

## Endpoints

| Method | Path      | Description         |
|--------|-----------|---------------------|
| GET    | /health   | Health check (200)  |
| GET    | /ready    | Readiness check     |
