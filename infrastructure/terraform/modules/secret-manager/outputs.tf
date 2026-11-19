# Outputs for Secret Manager Module

output "secret_names" {
  description = "Map of secret keys to secret names"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.secret_id }
}

output "secret_ids" {
  description = "Map of secret keys to full resource IDs"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.id }
}

output "secret_versions" {
  description = "Map of secret keys to initial version names"
  value       = { for k, v in google_secret_manager_secret_version.initial_versions : k => v.name }
}