# Variables for IAM Module

variable "env_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "service_accounts" {
  description = "Map of service accounts to create"
  type        = map(object({
    display_name = string
    description  = optional(string, "")
    labels       = optional(map(string), {})
  }))
  default = {}
}

variable "bindings" {
  description = "Map of IAM bindings to create"
  type        = map(object({
    role   = string
    member = string
  }))
  default = {}
}