# ============================================
# Stage 1: Build
# ============================================
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Download dependencies first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/api

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/server .

# Switch to non-root user
USER appuser

# Cloud Run injects PORT=8080 automatically. The app honors PORT env var (wire.go).
EXPOSE 8080

# Healthcheck uses the same port the app listens on
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --spider "http://localhost:${APP_PORT:-9090}/health" || exit 1

CMD ["./server"]