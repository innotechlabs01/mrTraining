# Pub/Sub Module for MR Training
# Creates topics and subscriptions in Floci Pub/Sub emulator

# Create Pub/Sub topics
resource "google_pubsub_topic" "topics" {
  for_each = var.topics

  name = "${var.env_prefix}-${each.key}"

  labels = merge(
    {
      environment = "local"
      managed_by  = "terraform"
      prefix      = var.env_prefix
    },
    each.value.labels
  )

  # Message retention (if supported by Floci)
  message_retention_duration = "604800s" # 7 days
}

# Create Pub/Sub subscriptions
resource "google_pubsub_subscription" "subscriptions" {
  for_each = var.subscriptions

  name  = "${var.env_prefix}-${each.key}"
  topic = google_pubsub_topic.topics[each.value.topic].id

  ack_deadline_seconds = each.value.ack_deadline

  # Message retention
  message_retention_duration = "${each.value.retention_days * 86400}s"

  # Expiration policy (never expire for local dev)
  expiration_policy {
    ttl = "0s"
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