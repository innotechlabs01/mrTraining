# Outputs for MR Training - Local Environment

# Secret Manager outputs
output "secret_manager_secret_names" {
  description = "Names of created secrets in Secret Manager"
  value       = module.secret_manager.secret_names
}

output "secret_manager_secret_ids" {
  description = "Full resource IDs of created secrets"
  value       = module.secret_manager.secret_ids
}

# Pub/Sub outputs
output "pubsub_topic_names" {
  description = "Names of created Pub/Sub topics"
  value       = module.pubsub.topic_names
}

output "pubsub_topic_ids" {
  description = "Full resource IDs of created Pub/Sub topics"
  value       = module.pubsub.topic_ids
}

output "pubsub_subscription_names" {
  description = "Names of created Pub/Sub subscriptions"
  value       = module.pubsub.subscription_names
}

output "pubsub_subscription_ids" {
  description = "Full resource IDs of created Pub/Sub subscriptions"
  value       = module.pubsub.subscription_ids
}

# Cloud Storage outputs
output "storage_bucket_names" {
  description = "Names of created Cloud Storage buckets"
  value       = module.storage.bucket_names
}

output "storage_bucket_urls" {
  description = "URLs of created Cloud Storage buckets"
  value       = module.storage.bucket_urls
}

# IAM outputs (if supported)
output "iam_service_account_emails" {
  description = "Email addresses of created service accounts"
  value       = module.iam.service_account_emails
}

output "iam_service_account_ids" {
  description = "Unique IDs of created service accounts"
  value       = module.iam.service_account_ids
}

# Floci health output
output "floci_endpoint" {
  description = "Floci GCP emulator endpoint"
  value       = var.floci_endpoint
}

output "floci_health" {
  description = "Floci health check response"
  value       = data.http.floci_health.body
}