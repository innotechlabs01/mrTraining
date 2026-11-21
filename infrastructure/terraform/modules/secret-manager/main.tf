# Secret Manager Module for MR Training
# Creates secrets in Floci Secret Manager emulator
# Note: Values are NOT stored in Terraform state - use Infisical for actual secret values

resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets

  secret_id = "${var.env_prefix}-${each.key}"

  replication {
    # Automatic replication - let GCP choose regions
    auto {}
  }

  labels = merge(
    {
      environment = "local"
      managed_by  = "terraform"
      prefix      = var.env_prefix
    },
    each.value.labels
  )
}

# Create initial secret versions with placeholder values
# IMPORTANT: Real secret values MUST come from Infisical, not Terraform
# These are just placeholder versions to satisfy the resource creation
resource "google_secret_manager_secret_version" "initial_versions" {
  for_each = var.secrets

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = base64encode("PLACEHOLDER-${each.key}-MANAGED-BY-INFISICAL")
}