# Outputs for IAM Module

output "service_account_emails" {
  description = "Map of service account keys to email addresses"
  value       = { for k, v in google_service_account.service_accounts : k => v.email }
}

output "service_account_ids" {
  description = "Map of service account keys to unique IDs"
  value       = { for k, v in google_service_account.service_accounts : k => v.unique_id }
}

output "iam_bindings" {
  description = "Map of binding keys to IAM member resources"
  value       = { for k, v in google_project_iam_member.bindings : k => v.id }
}