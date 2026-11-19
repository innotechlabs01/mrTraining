# IAM Module for MR Training
# Creates service accounts and basic IAM bindings in Floci IAM emulator
# NOTE: IAM support in Floci is limited. This module may not work fully.

# Create service accounts
resource "google_service_account" "service_accounts" {
  for_each = var.service_accounts

  # Use a shorter account_id to stay within 6-30 character limit
  account_id   = replace("${var.env_prefix}-${each.key}", "mr-training-local-", "mrt-")
  display_name = each.value.display_name
  description  = each.value.description
}

# Basic IAM bindings (project-level roles)
# These may not work fully in Floci but are defined for future compatibility
resource "google_project_iam_member" "bindings" {
  for_each = var.bindings

  project = var.project_id
  role    = each.value.role
  member  = each.value.member
}