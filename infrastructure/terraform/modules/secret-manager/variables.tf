# Variables for Secret Manager Module

variable "env_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "secrets" {
  description = "Map of secrets to create (metadata only)"
  type        = map(object({
    replication_policy = optional(string, "automatic")
    labels             = optional(map(string), {})
  }))
  default = {}
}