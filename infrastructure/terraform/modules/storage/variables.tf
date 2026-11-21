# Variables for Cloud Storage Module

variable "env_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "buckets" {
  description = "Map of Cloud Storage buckets to create"
  type        = map(object({
    location       = optional(string, "US-CENTRAL1")
    storage_class  = optional(string, "STANDARD")
    versioning     = optional(bool, false)
    labels         = optional(map(string), {})
    lifecycle_rules = optional(list(object({
      action = string
      condition = object({
        age = optional(number)
        matches_storage_class = optional(list(string))
      })
    })), [])
  }))
  default = {}
}