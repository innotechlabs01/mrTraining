# Variables for Pub/Sub Module

variable "env_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "topics" {
  description = "Map of Pub/Sub topics to create"
  type        = map(object({
    labels = optional(map(string), {})
  }))
  default = {}
}

variable "subscriptions" {
  description = "Map of Pub/Sub subscriptions to create"
  type        = map(object({
    topic           = string
    ack_deadline    = optional(number, 10)
    retention_days  = optional(number, 7)
    labels          = optional(map(string), {})
  }))
  default = {}
}