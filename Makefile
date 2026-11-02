# Makefile for MR Training - Test & Build Commands

.PHONY: test-all test-go test-web test-e2e build-all lint-all clean

# Run all tests (what CI runs)
test-all: test-go test-web
	@echo "✅ All tests passed!"

# Go API tests
test-go:
	@echo "🧪 Running Go API tests..."
	cd apps/api && go test ./internal/... -v -race -count=1

# Go API tests (short mode for pre-commit)
test-go-short:
	@echo "🧪 Running Go API tests (short)..."
	cd apps/api && go test ./internal/application/... -short -count=1

# Web tests
test-web:
	@echo "🧪 Running Web tests..."
	cd apps/web && pnpm lint && pnpm build && pnpm test --if-present

# E2E tests (requires running servers)
test-e2e:
	@echo "🧪 Running E2E tests..."
	cd apps/web && pnpm test:e2e

# Build all
build-all: build-go build-web

build-go:
	@echo "🔨 Building Go API..."
	cd apps/api && go build ./...

build-web:
	@echo "🔨 Building Web..."
	cd apps/web && pnpm build

# Lint all
lint-all: lint-go lint-web

lint-go:
	@echo "🔍 Linting Go..."
	cd apps/api && golangci-lint run ./...

lint-web:
	@echo "🔍 Linting Web..."
	cd apps/web && pnpm lint

# Format
fmt-all: fmt-go fmt-web

fmt-go:
	cd apps/api && go fmt ./...

fmt-web:
	cd apps/web && pnpm format 2>/dev/null || echo "No format script"

# Clean
clean:
	@echo "🧹 Cleaning..."
	cd apps/api && go clean -cache -testcache -modcache
	cd apps/web && rm -rf .next node_modules/.cache

# Dev servers
dev-go:
	cd apps/api && go run cmd/api/main.go

dev-web:
	cd apps/web && pnpm dev

# Install hooks
install-hooks:
	@echo "📦 Installing git hooks..."
	cp .githooks/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "✅ Hooks installed"

# Full CI simulation locally
ci-local: test-go test-web
	@echo "🎉 Local CI simulation complete!"