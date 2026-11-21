# Outputs for Pub/Sub Module

output "topic_names" {
  description = "Map of topic keys to topic names"
  value       = { for k, v in google_pubsub_topic.topics : k => v.name }
}

output "topic_ids" {
  description = "Map of topic keys to full resource IDs"
  value       = { for k, v in google_pubsub_topic.topics : k => v.id }
}

output "subscription_names" {
  description = "Map of subscription keys to subscription names"
  value       = { for k, v in google_pubsub_subscription.subscriptions : k => v.name }
}

output "subscription_ids" {
  description = "Map of subscription keys to full resource IDs"
  value       = { for k, v in google_pubsub_subscription.subscriptions : k => v.id }
}