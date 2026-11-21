# Makefile for MR Training Terraform - Local Environment
# Run from: infrastructure/terraform/environments/local/

.PHONY: terraform-init terraform-fmt terraform-validate infra-plan infra-apply infra-output infra-destroy-test

# Terraform wrapper script (sets up Floci environment)
TF_WRAPPER := ./terraform-wrapper.sh

# Working directory
TF_DIR := .

# Colors
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m

# ============================================
# Terraform Initialization
# ============================================
terraform-init:
	@echo "$(GREEN)🔧 Initializing Terraform...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) init -upgrade
	@echo "$(GREEN)✅ Terraform initialized$(NC)"

# ============================================
# Format Check
# ============================================
terraform-fmt:
	@echo "$(GREEN)📝 Formatting Terraform files...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) fmt -check -recursive
	@echo "$(GREEN)✅ Format check passed$(NC)"

terraform-fmt-fix:
	@echo "$(GREEN)🔧 Fixing Terraform formatting...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) fmt -recursive
	@echo "$(GREEN)✅ Formatting fixed$(NC)"

# ============================================
# Validation
# ============================================
terraform-validate:
	@echo "$(GREEN)🔍 Validating Terraform configuration...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) validate
	@echo "$(GREEN)✅ Validation passed$(NC)"

# ============================================
# Plan
# ============================================
infra-plan: terraform-validate
	@echo "$(GREEN)📋 Generating execution plan...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) plan -out=tfplan.local
	@echo "$(GREEN)✅ Plan generated$(NC)"

# ============================================
# Apply
# ============================================
infra-apply:
	@echo "$(GREEN)🚀 Applying to Floci GCP emulator...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) apply -auto-approve
	@echo "$(GREEN)✅ Apply complete$(NC)"

# Apply with existing plan file
infra-apply-plan:
	@echo "$(GREEN)🚀 Applying saved plan...$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) apply tfplan.local
	@echo "$(GREEN)✅ Apply complete$(NC)"

# ============================================
# Outputs
# ============================================
infra-output:
	@echo "$(GREEN)📤 Terraform outputs:$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) output -json | jq .

# ============================================
# Destroy Test Resources Only
# ============================================
infra-destroy-test:
	@echo "$(YELLOW)⚠️  Destroying TEST resources only...$(NC)"
	@echo "$(YELLOW)This targets only resources with 'test-' prefix in their names.$(NC)"
	@$(TF_WRAPPER) -chdir=$(TF_DIR) destroy \
		-target=google_secret_manager_secret.secrets["test-secret"] \
		-target=google_pubsub_topic.topics["test-topic"] \
		-target=google_pubsub_subscription.subscriptions["test-sub"] \
		-target=google_storage_bucket.buckets["test-bucket"] \
		-auto-approve || echo "$(YELLOW)Some test resources may not exist$(NC)"
	@echo "$(GREEN)✅ Test destroy complete$(NC)"

# ============================================
# Full Destroy (DANGEROUS - use with caution)
# ============================================
infra-destroy:
	@echo "$(RED)⚠️  DANGER: This will destroy ALL local resources!$(NC)"
	@read -p "Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(TF_WRAPPER) -chdir=$(TF_DIR) destroy -auto-approve; \
		echo "$(GREEN)✅ Destroy complete$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

# ============================================
# Verify Floci Connectivity
# ============================================
verify-floci:
	@echo "$(GREEN)🔍 Verifying Floci connectivity...$(NC)"
	@curl -sf http://localhost:4588/health | jq . > /dev/null && echo "$(GREEN)✅ Floci is healthy$(NC)" || (echo "$(RED)❌ Floci not reachable$(NC)" && exit 1)

# ============================================
# Full Validation Pipeline
# ============================================
validate-all: verify-floci terraform-init terraform-fmt terraform-validate infra-plan
	@echo "$(GREEN)✅ All validations passed$(NC)"

# ============================================
# Clean
# ============================================
clean:
	@echo "$(YELLOW)🧹 Cleaning Terraform files...$(NC)"
	@rm -f $(TF_DIR)/tfplan.local
	@rm -f $(TF_DIR)/.terraform.lock.hcl
	@rm -rf $(TF_DIR)/.terraform
	@echo "$(GREEN)✅ Clean complete$(NC)"

# ============================================
# Help
# ============================================
help:
	@echo "MR Training Terraform - Local Environment"
	@echo ""
	@echo "Commands:"
	@echo "  make terraform-init       - Initialize Terraform"
	@echo "  make terraform-fmt        - Check formatting"
	@echo "  make terraform-fmt-fix    - Fix formatting"
	@echo "  make terraform-validate   - Validate configuration"
	@echo "  make infra-plan           - Generate execution plan"
	@echo "  make infra-apply          - Apply to Floci"
	@echo "  make infra-output         - Show outputs"
	@echo "  make infra-destroy-test   - Destroy test resources only"
	@echo "  make infra-destroy        - Destroy ALL resources (dangerous)"
	@echo "  make verify-floci         - Check Floci connectivity"
	@echo "  make validate-all         - Run full validation pipeline"
	@echo "  make clean                - Clean Terraform cache"