# Makefile for MR Training API
# All commands run from apps/api directory
#
# Usage:
#   make doctor        # Check dependencies and port availability
#   make init          # Initialize environment (copy .env.local if missing)
#   make up            # Start core services (api, postgres, redis)
#   make up-full       # Start full stack (core + nats)
#   make up-infra      # Start full infra (reuses existing Floci/Infisical)
#   make down          # Stop services (preserves volumes)
#   make logs          # Follow logs
#   make build         # Build Docker image
#   make test          # Run all tests
#   make test-unit     # Run unit tests only
#   make test-integration # Run integration tests (requires running services)
#   make lint          # Run linters
#   make migrate       # Apply database migrations
#   make migrate-dry   # List pending migrations
#   make migrate-status # Show migration status
#   make shell         # Open shell in running API container
#   make ps            # Show service status
#   make clean         # Clean build artifacts

.PHONY: doctor init up up-full up-infra down logs build test test-unit test-integration lint migrate migrate-dry migrate-status shell ps clean infisical-test infisical-verify k8s-doctor k8s-create k8s-status k8s-build k8s-deploy k8s-logs k8s-test argocd-status argocd-sync

# Default profile
PROFILE ?= core
COMPOSE_FILE := docker-compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE) --profile $(PROFILE)

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m

# ============================================
# Doctor - Check prerequisites
# ============================================
doctor:
	@echo "$(GREEN)🔍 Checking prerequisites...$(NC)"
	@echo ""
	@echo "Docker:"
	@docker version --format '  Client: {{.Client.Version}}' 2>/dev/null || (echo "$(RED)  ❌ Docker not installed$(NC)" && exit 1)
	@docker compose version --format '  Compose: {{.Version}}' 2>/dev/null || (echo "$(RED)  ❌ Docker Compose not available$(NC)" && exit 1)
	@echo "$(GREEN)  ✅ Docker OK$(NC)"
	@echo ""
	@echo "Port availability:"
	@for port in 9090 5436 6380 4222 8222; do \
		if lsof -ti:$$port >/dev/null 2>&1; then \
			echo "$(YELLOW)  ⚠️  Port $$port is in use$(NC)"; \
		else \
			echo "$(GREEN)  ✅ Port $$port available$(NC)"; \
		fi; \
	done
	@echo ""
	@echo "Go:"
	@go version | sed 's/^/  /'
	@echo ""
	@echo "Environment files:"
	@if [ -f .env.local ]; then \
		echo "$(GREEN)  ✅ .env.local exists$(NC)"; \
	else \
		echo "$(YELLOW)  ⚠️  .env.local missing (run 'make init')$(NC)"; \
	fi
	@if [ -f .env ]; then \
		echo "$(GREEN)  ✅ .env exists$(NC)"; \
	else \
		echo "$(YELLOW)  ⚠️  .env missing (optional for Docker)$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)✅ Doctor check complete$(NC)"

# ============================================
# Init - Initialize environment
# ============================================
init:
	@echo "$(GREEN)🚀 Initializing environment...$(NC)"
	@if [ ! -f .env.local ]; then \
		cp .env.local.example .env.local 2>/dev/null || echo "$(YELLOW)⚠️  .env.local.example not found, create manually$(NC)"; \
	else \
		echo "$(GREEN)✅ .env.local already exists$(NC)"; \
	fi
	@if [ ! -f .env ]; then \
		cp .env.example .env 2>/dev/null || echo "$(YELLOW)⚠️  .env.example not found, create manually$(NC)"; \
	else \
		echo "$(GREEN)✅ .env already exists$(NC)"; \
	fi
	@echo "$(GREEN)✅ Init complete$(NC)"

# ============================================
# Up - Start services
# ============================================
up:
	@echo "$(GREEN)🐳 Starting core services (profile: core)...$(NC)"
	$(COMPOSE) up -d --remove-orphans
	@echo "$(GREEN)✅ Services started$(NC)"
	@make ps

up-full:
	@echo "$(GREEN)🐳 Starting full stack (profile: full)...$(NC)"
	@$(MAKE) up PROFILE=full

up-infra:
	@echo "$(GREEN)🐳 Starting full infra (profile: infra)...$(NC)"
	@$(MAKE) up PROFILE=infra

# ============================================
# Down - Stop services (preserve volumes)
# ============================================
down:
	@echo "$(YELLOW)🛑 Stopping services (volumes preserved)...$(NC)"
	$(COMPOSE) down --remove-orphans
	@echo "$(GREEN)✅ Services stopped$(NC)"

# ============================================
# Logs - Follow logs
# ============================================
logs:
	$(COMPOSE) logs -f --tail=100

logs-api:
	$(COMPOSE) logs -f --tail=100 api

logs-postgres:
	$(COMPOSE) logs -f --tail=100 postgres

logs-redis:
	$(COMPOSE) logs -f --tail=100 redis

logs-nats:
	$(COMPOSE) logs -f --tail=100 nats

# ============================================
# Build - Build Docker image
# ============================================
build:
	@echo "$(GREEN)🔨 Building Docker image...$(NC)"
	$(COMPOSE) build --no-cache api
	@echo "$(GREEN)✅ Build complete$(NC)"

# ============================================
# Test - Run tests
# ============================================
test: test-unit test-integration

test-unit:
	@echo "$(GREEN)🧪 Running unit tests...$(NC)"
	go test ./internal/... -v -race -count=1 -short
	@echo "$(GREEN)✅ Unit tests passed$(NC)"

test-integration:
	@echo "$(GREEN)🧪 Running integration tests (requires running services)...$(NC)"
	@if ! docker compose -f $(COMPOSE_FILE) --profile core ps api | grep -q "Up"; then \
		echo "$(YELLOW)⚠️  API not running. Starting core services...$(NC)"; \
		$(MAKE) up; \
		sleep 5; \
	fi
	go test ./internal/... -v -race -count=1 -run Integration
	@echo "$(GREEN)✅ Integration tests passed$(NC)"

# ============================================
# Lint - Run linters
# ============================================
lint:
	@echo "$(GREEN)🔍 Running linters...$(NC)"
	@which golangci-lint >/dev/null 2>&1 || (echo "$(RED)❌ golangci-lint not installed$(NC)" && exit 1)
	golangci-lint run ./...
	@echo "$(GREEN)✅ Lint passed$(NC)"

lint-fix:
	@echo "$(GREEN)🔧 Running linters with auto-fix...$(NC)"
	golangci-lint run ./... --fix

# ============================================
# Migrations
# ============================================
migrate:
	@echo "$(GREEN)📦 Applying database migrations...$(NC)"
	@if ! docker compose -f $(COMPOSE_FILE) --profile core ps postgres | grep -q "Up"; then \
		echo "$(YELLOW)⚠️  PostgreSQL not running. Starting core services...$(NC)"; \
		$(MAKE) up; \
		sleep 5; \
	fi
	go run ./cmd/migrate/main.go -dir migrations/postgres
	@echo "$(GREEN)✅ Migrations applied$(NC)"

migrate-dry:
	@echo "$(GREEN)📋 Listing pending migrations...$(NC)"
	@if ! docker compose -f $(COMPOSE_FILE) --profile core ps postgres | grep -q "Up"; then \
		echo "$(YELLOW)⚠️  PostgreSQL not running. Starting core services...$(NC)"; \
		$(MAKE) up; \
		sleep 5; \
	fi
	go run ./cmd/migrate/main.go -dir migrations/postgres -dry-run

migrate-status:
	@echo "$(GREEN)📊 Migration status...$(NC)"
	@if ! docker compose -f $(COMPOSE_FILE) --profile core ps postgres | grep -q "Up"; then \
		echo "$(YELLOW)⚠️  PostgreSQL not running. Starting core services...$(NC)"; \
		$(MAKE) up; \
		sleep 5; \
	fi
	go run ./cmd/migrate/main.go -dir migrations/postgres -dry-run

# ============================================
# Shell - Open shell in API container
# ============================================
shell:
	$(COMPOSE) exec api sh

# ============================================
# PS - Show service status
# ============================================
ps:
	@echo "$(GREEN)📋 Service status:$(NC)"
	@docker compose -f $(COMPOSE_FILE) --profile $(PROFILE) ps

# ============================================
# Clean - Clean build artifacts
# ============================================
clean:
	@echo "$(YELLOW)🧹 Cleaning build artifacts...$(NC)"
	go clean -cache -testcache -modcache
	rm -f server
	@echo "$(GREEN)✅ Clean complete$(NC)"

# ============================================
# Validate - Full validation pipeline
# ============================================
validate: doctor build test-unit lint migrate-dry
	@echo "$(GREEN)✅ All validations passed$(NC)"

# ============================================
# Smoke test - Quick API health check
# ============================================
smoke:
	@echo "$(GREEN)💨 Running smoke tests...$(NC)"
	@sleep 2
	@curl -sf http://localhost:9090/health | jq . || (echo "$(RED)❌ Health check failed$(NC)" && exit 1)
	@curl -sf http://localhost:9090/ready | jq . || (echo "$(RED)❌ Readiness check failed$(NC)" && exit 1)
	@echo "$(GREEN)✅ Smoke tests passed$(NC)"

# ============================================
# Infisical - Secrets management
# ============================================
infisical-test:
	@echo "$(GREEN)🔐 Testing Infisical connectivity...$(NC)"
	@if [ -z "$(INFISICAL_CLIENT_ID)" ] || [ -z "$(INFISICAL_CLIENT_SECRET)" ]; then \
		echo "$(YELLOW)⚠️  INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET not set$(NC)"; \
		echo "$(YELLOW)   Create a machine identity in Infisical UI first$(NC)"; \
		exit 0; \
	fi
	@curl -sf -X POST "$(INFISICAL_BASE_URL:-http://localhost:80)/api/v1/auth/universal-auth/login" \
		-H "Content-Type: application/x-www-form-urlencoded" \
		-d "clientId=$(INFISICAL_CLIENT_ID)&clientSecret=$(INFISICAL_CLIENT_SECRET)" | jq .
	@echo "$(GREEN)✅ Infisical authentication successful$(NC)"

infisical-verify:
	@echo "$(GREEN)🔍 Verifying Infisical integration...$(NC)"
	@if [ "$(INFISICAL_ENABLED)" != "true" ]; then \
		echo "$(YELLOW)⚠️  INFISICAL_ENABLED is not true$(NC)"; \
		exit 0; \
	fi
	@if [ -z "$(INFISICAL_PROJECT_ID)" ]; then \
		echo "$(RED)❌ INFISICAL_PROJECT_ID not set$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Infisical configuration verified$(NC)"

infisical-sync:
	@echo "$(GREEN)🔄 Syncing Infisical (Local + QA) & Google Secret Manager...$(NC)"
	@bash ../../scripts/sync-infisical.sh

# ============================================
# Kubernetes (k3d) Operations
# ============================================
K8S_DIR := ../infrastructure/kubernetes

k8s-doctor:
	@echo "$(GREEN)🔍 Checking Kubernetes prerequisites...$(NC)"
	@which k3d >/dev/null 2>&1 || (echo "$(RED)❌ k3d not installed$(NC)" && exit 1)
	@which kubectl >/dev/null 2>&1 || (echo "$(RED)❌ kubectl not installed$(NC)" && exit 1)
	@echo "$(GREEN)  ✅ k3d: $$(k3d version 2>/dev/null | head -1)$(NC)"
	@echo "$(GREEN)  ✅ kubectl: $$(kubectl version --client 2>/dev/null | head -1)$(NC)"
	@kubectl cluster-info >/dev/null 2>&1 && echo "$(GREEN)  ✅ Cluster accessible$(NC)" || echo "$(RED)  ❌ Cluster not accessible$(NC)"
	@kubectl get nodes 2>&1 | tail -1

k8s-create:
	@echo "$(GREEN)🚀 Creating k3d cluster...$(NC)"
	@k3d cluster create mr-training \
		--servers 1 --agents 0 \
		--k3s-arg "--disable=traefik@server:0" \
		--k3s-arg "--disable=servicelb@server:0" \
		--k3s-arg "--disable=metrics-server@server:0" \
		--k3s-arg "--kubelet-arg=max-pods=50@server:0" \
		-p 9090:9090@server:0 \
		-p 8080:80@server:0 \
		-p 8443:443@server:0 \
		-v /var/run/docker.sock:/var/run/docker.sock@server:0 \
		--kubeconfig-update-default --kubeconfig-switch-context --wait 2>&1 | tail -5
	@echo "$(GREEN)✅ Cluster created$(NC)"

k8s-status:
	@echo "$(GREEN)📋 Kubernetes status:$(NC)"
	@kubectl cluster-info 2>&1 | head -3
	@echo ""
	@kubectl get nodes 2>&1
	@echo ""
	@kubectl get namespaces 2>&1
	@echo ""
	@kubectl get pods -n mr-training 2>&1 || echo "  No mr-training namespace yet"
	@echo ""
	@kubectl get pods -n argocd 2>&1 || echo "  No argocd namespace yet"
	@echo ""
	@kubectl get application -n argocd 2>&1 || echo "  No Argo CD applications yet"

k8s-build:
	@echo "$(GREEN)🔨 Building Docker image for k8s...$(NC)"
	@cd $(CURDIR) && docker build -t mr-training-api:latest -f Dockerfile . 2>&1 | tail -3
	@echo "$(GREEN)📦 Importing image into k3d...$(NC)"
	@k3d image import mr-training-api:latest -c mr-training 2>&1 | tail -3
	@echo "$(GREEN)✅ Image built and imported$(NC)"

k8s-deploy:
	@echo "$(GREEN)🚀 Deploying to Kubernetes...$(NC)"
	@kubectl apply -f $(K8S_DIR)/base/ 2>&1
	@echo "$(GREEN)✅ Deployed$(NC)"

k8s-logs:
	@echo "$(GREEN)📋 API logs:$(NC)"
	@POD=$$(kubectl get pod -l app=mr-training-api -n mr-training --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null) && \
	if [ -n "$$POD" ]; then kubectl logs $$POD -n mr-training --tail=50; else echo "  No running pod found"; fi

k8s-test:
	@echo "$(GREEN)🧪 Running k8s tests...$(NC)"
	@sleep 3
	@curl -sf http://localhost:9090/health | jq . || (echo "$(RED)❌ Health check failed$(NC)" && exit 1)
	@curl -sf http://localhost:9090/ready | jq . || (echo "$(RED)❌ Readiness check failed$(NC)" && exit 1)
	@POD=$$(kubectl get pod -l app=mr-training-api -n mr-training --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null) && \
	kubectl exec $$POD -n mr-training -- sh -c "nc -zv 172.27.0.3 5432" 2>&1 && \
	kubectl exec $$POD -n mr-training -- sh -c "nc -zv 172.27.0.2 6379" 2>&1
	@echo "$(GREEN)✅ All k8s tests passed$(NC)"

argocd-status:
	@echo "$(GREEN)📊 Argo CD status:$(NC)"
	@kubectl get pods -n argocd 2>&1
	@echo ""
	@kubectl get application -n argocd 2>&1

argocd-sync:
	@echo "$(GREEN)🔄 Syncing Argo CD application...$(NC)"
	@kubectl annotate application -n argocd mr-training-api "argocd.argoproj.io/refresh"="$$(date +%s)" --overwrite 2>&1
	@echo "$(GREEN)✅ Sync triggered$(NC)"

# ============================================
# Docker - API via docker compose
# Siempre reconstruye la imagen que compose usa (api-api) y recrea el
# container, para que un cambio en el backend quede aplicado de verdad.
# Host 9091 -> container 9090 (ver ports en docker-compose.yml).
# ============================================
DOCKER_CONTAINER := mr-training-api
HOST_PORT        := 9091
CONTAINER_PORT   := 9090

.PHONY: docker-build docker-stop docker-rm docker-run docker-restart doctor-restart docker-logs docker-health

docker-build:
	@echo "$(GREEN)🔨 Building api image...$(NC)"
	$(COMPOSE) build api

docker-stop:
	@echo "$(YELLOW)🛑 Stopping $(DOCKER_CONTAINER)...$(NC)"
	$(COMPOSE) stop api

docker-rm: docker-stop
	@echo "$(YELLOW)🗑️  Removing $(DOCKER_CONTAINER)...$(NC)"
	$(COMPOSE) rm -sf api

docker-run: docker-build
	@echo "$(GREEN)🚀 Running $(DOCKER_CONTAINER) on $(HOST_PORT):$(CONTAINER_PORT)...$(NC)"
	$(COMPOSE) up -d api

docker-restart: docker-build
	@echo "$(GREEN)♻️  Recreating $(DOCKER_CONTAINER)...$(NC)"
	$(COMPOSE) up -d --force-recreate api
	@echo "$(GREEN)✅ API desplegada en http://localhost:$(HOST_PORT)$(NC)"

# Alias usado en el día a día: mismo flujo que docker-restart.
doctor-restart: docker-restart

docker-logs:
	$(COMPOSE) logs -f --tail=100 api

docker-health:
	@curl -sf http://localhost:$(HOST_PORT)/health && echo ""
	@curl -sf http://localhost:$(HOST_PORT)/ready && echo ""
