# Module Instances for MR Training - Local Environment
# All modules use the Floci GCP emulator endpoint

# Secret Manager Module
module "secret_manager" {
  source  = "../../modules/secret-manager"
  env_prefix = var.env_prefix
  secrets    = var.secret_manager_secrets
}

# Pub/Sub Module
module "pubsub" {
  source  = "../../modules/pubsub"
  env_prefix     = var.env_prefix
  topics         = var.pubsub_topics
  subscriptions  = var.pubsub_subscriptions
}

# Cloud Storage Module
module "storage" {
  source  = "../../modules/storage"
  env_prefix = var.env_prefix
  buckets    = var.storage_buckets
}

# IAM Module (experimental - Floci IAM support may be limited)
module "iam" {
  source  = "../../modules/iam"
  env_prefix      = var.env_prefix
  project_id      = var.project_id
  service_accounts = var.iam_service_accounts
  # bindings = {}  # Uncomment when Floci IAM bindings are verified
}