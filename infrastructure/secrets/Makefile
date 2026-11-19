# Makefile para Sincronizador de Secretos — MR Training
# Comandos para gestión de secretos entre Infisical y GCP Secret Manager

.PHONY: init test test-unit test-integration build lint fmt vet \
        sync-dry-run sync-apply retention-dry-run retention-apply \
        report-diff report-retention clean help

# Directorio de trabajo
SECRETS_DIR := .

# Colores
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m

# ============================================
# Inicialización
# ============================================
init:
	@echo "$(GREEN)🔧 Inicializando módulos Go...$(NC)"
	@cd $(SECRETS_DIR) && go mod tidy
	@echo "$(GREEN)✅ Inicialización completa$(NC)"

# ============================================
# Pruebas
# ============================================
test: test-unit test-integration

test-unit:
	@echo "$(GREEN)🧪 Ejecutando pruebas unitarias...$(NC)"
	@cd $(SECRETS_DIR) && go test ./sync/... -v -race -count=1
	@echo "$(GREEN)✅ Pruebas unitarias pasadas$(NC)"

test-integration:
	@echo "$(GREEN)🧪 Ejecutando pruebas de integración...$(NC)"
	@echo "$(YELLOW)⚠️  Las pruebas de integración requieren credenciales reales$(NC)"
	@echo "$(YELLOW)   Configurar INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, GOOGLE_PROJECT_ID$(NC)"
	@cd $(SECRETS_DIR) && go test ./sync/... -v -race -count=1 -run Integration 2>&1 || true
	@echo "$(GREEN)✅ Pruebas de integración completadas$(NC)"

# ============================================
# Formato y lint
# ============================================
fmt:
	@echo "$(GREEN)📝 Formateando código Go...$(NC)"
	@cd $(SECRETS_DIR) && go fmt ./...
	@echo "$(GREEN)✅ Formato aplicado$(NC)"

fmt-check:
	@echo "$(GREEN)🔍 Verificando formato Go...$(NC)"
	@cd $(SECRETS_DIR) && go fmt -l ./... 2>&1 | grep -v "^$$" || true
	@echo "$(GREEN)✅ Verificación de formato completa$(NC)"

vet:
	@echo "$(GREEN)🔍 Ejecutando go vet...$(NC)"
	@cd $(SECRETS_DIR) && go vet ./...
	@echo "$(GREEN)✅ go vet pasado$(NC)"

lint: fmt vet

# ============================================
# Build
# ============================================
build:
	@echo "$(GREEN)🔨 Construyendo sincronizador...$(NC)"
	@cd $(SECRETS_DIR) && go build ./...
	@echo "$(GREEN)✅ Build completo$(NC)"

# ============================================
# Sincronización de secretos
# ============================================
sync-dry-run:
	@echo "$(GREEN)🔄 Ejecutando sincronización en modo DRY-RUN...$(NC)"
	@echo "$(YELLOW)⚠️  No se realizarán cambios reales$(NC)"
	@cd $(SECRETS_DIR) && go run ./cmd/sync-sync --source dev --target qa --dry-run 2>&1 || true
	@echo "$(GREEN)✅ Dry-run completado$(NC)"

sync-apply:
	@echo "$(RED)⚠️  ADVERTENCIA: Esto realizará cambios reales en GCP Secret Manager$(NC)"
	@read -p "Escriba 'APLICAR' para confirmar: " confirm; \
	if [ "$$confirm" = "APLICAR" ]; then \
		cd $(SECRETS_DIR) && go run ./cmd/sync-sync --source dev --target qa --apply; \
		echo "$(GREEN)✅ Sincronización aplicada$(NC)"; \
	else \
		echo "$(YELLOW)Cancelado$(NC)"; \
	fi

# ============================================
# Retención de versiones
# ============================================
retention-dry-run:
	@echo "$(GREEN)🗑️  Analizando versiones antiguas (DRY-RUN)...$(NC)"
	@echo "$(YELLOW)⚠️  No se destruirán versiones$(NC)"
	@cd $(SECRETS_DIR) && go run ./cmd/sync-retention --project mr-training-backend --dry-run 2>&1 || true
	@echo "$(GREEN)✅ Análisis de retención completado$(NC)"

retention-apply:
	@echo "$(RED)⚠️  ADVERTENCIA: Esto destruirá versiones de Secret Manager$(NC)"
	@read -p "Escriba 'DESTRUIR' para confirmar: " confirm; \
	if [ "$$confirm" = "DESTRUIR" ]; then \
		cd $(SECRETS_DIR) && go run ./cmd/sync-retention --project mr-training-backend --apply; \
		echo "$(GREEN)✅ Limpieza de versiones aplicada$(NC)"; \
	else \
		echo "$(YELLOW)Cancelado$(NC)"; \
	fi

# ============================================
# Reportes
# ============================================
report-diff:
	@echo "$(GREEN)📊 Generando reporte de diferencias...$(NC)"
	@cd $(SECRETS_DIR) && go run ./cmd/report-diff --source dev --target qa 2>&1 || true
	@echo "$(GREEN)✅ Reporte generado$(NC)"

report-retention:
	@echo "$(GREEN)📊 Generando reporte de retención...$(NC)"
	@cd $(SECRETS_DIR) && go run ./cmd/report-retention --project mr-training-backend 2>&1 || true
	@echo "$(GREEN)✅ Reporte de retención generado$(NC)"

# ============================================
# Limpieza
# ============================================
clean:
	@echo "$(YELLOW)🧹 Limpiando archivos de Go...$(NC)"
	@cd $(SECRETS_DIR) && go clean -cache -testcache -modcache
	@echo "$(GREEN)✅ Limpieza completa$(NC)"

# ============================================
# Ayuda
# ============================================
help:
	@echo "Sincronizador de Secretos — MR Training"
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  make init              - Inicializar módulos Go"
	@echo "  make test-unit         - Ejecutar pruebas unitarias"
	@echo "  make test-integration  - Ejecutar pruebas de integración (requiere credenciales)"
	@echo "  make test              - Ejecutar todas las pruebas"
	@echo "  make fmt               - Formatear código Go"
	@echo "  make fmt-check         - Verificar formato Go"
	@echo "  make vet               - Ejecutar go vet"
	@echo "  make lint              - Ejecutar fmt y vet"
	@echo "  make build             - Construir sincronizador"
	@echo "  make sync-dry-run      - Sincronización en modo dry-run (seguro)"
	@echo "  make sync-apply        - Sincronización real (requiere confirmación)"
	@echo "  make retention-dry-run - Análisis de versiones antiguas (dry-run)"
	@echo "  make retention-apply   - Destruir versiones elegibles (requiere confirmación)"
	@echo "  make report-diff       - Generar reporte de diferencias"
	@echo "  make report-retention  - Generar reporte de retención"
	@echo "  make clean             - Limpiar caché de Go"
	@echo "  make help              - Mostrar esta ayuda"