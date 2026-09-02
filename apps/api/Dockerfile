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
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/server .

# Switch to non-root user
USER appuser

EXPOSE 8080

CMD ["./server"]
