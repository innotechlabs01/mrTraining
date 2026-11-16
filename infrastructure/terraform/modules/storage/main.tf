# Cloud Storage Module for MR Training
# Creates buckets in Floci Cloud Storage (GCS) emulator

resource "google_storage_bucket" "buckets" {
  for_each = var.buckets

  # Strip the env_prefix from the key if it's already included
  # This handles both cases: keys with or without the prefix
  name     = each.key
  location = each.value.location

  storage_class = each.value.storage_class

  versioning {
    enabled = each.value.versioning
  }

  labels = merge(
    {
      environment = "local"
      managed_by  = "terraform"
      prefix      = var.env_prefix
    },
    each.value.labels
  )

  # Lifecycle rules
  dynamic "lifecycle_rule" {
    for_each = each.value.lifecycle_rules
    content {
      action {
        type = lifecycle_rule.value.action
      }
      condition {
        age                     = lookup(lifecycle_rule.value.condition, "age", null)
        matches_storage_class   = lookup(lifecycle_rule.value.condition, "matches_storage_class", null)
      }
    }
  }

  # Uniform bucket-level access (simpler for local dev)
  uniform_bucket_level_access = true

  # Public access prevention (local only, but good practice)
  public_access_prevention = "enforced"
}