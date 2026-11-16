# Variables for MR Training - Local Environment (Floci GCP Emulator)
# These values are safe for local development and MUST NOT be used for real GCP

variable "project_id" {
  description = "GCP Project ID - Must be 'floci-local' for Floci emulator"
  type        = string
  default     = "floci-local"

  validation {
    condition     = var.project_id == "floci-local"
    error_message = "Project ID must be 'floci-local' for local Floci emulator. This prevents accidental real GCP operations."
  }
}

variable "region" {
  description = "GCP Region for resources"
  type        = string
  default     = "us-central1"
}

variable "floci_endpoint" {
  description = "Floci GCP emulator endpoint (HTTP)"
  type        = string
  default     = "http://localhost:4588"
}

# Environment-specific naming prefix
variable "env_prefix" {
  description = "Prefix for all resource names to avoid conflicts"
  type        = string
  default     = "mr-training-local"
}

# Secret Manager configuration
variable "secret_manager_secrets" {
  description = "Map of secrets to create in Secret Manager (metadata only, no values)"
  type        = map(object({
    replication_policy = optional(string, "automatic")
    labels             = optional(map(string), {})
  }))
  default = {
    "db-password" = {
      replication_policy = "automatic"
      labels = {
        environment = "local"
        managed_by  = "terraform"
      }
    }
    "clerk-secret-key" = {
      replication_policy = "automatic"
      labels = {
        environment = "local"
        managed_by  = "terraform"
      }
    }
    "wompi-private-key" = {
      replication_policy = "automatic"
      labels = {
        environment = "local"
        managed_by  = "terraform"
      }
    }
  }
}

# Pub/Sub configuration
variable "pubsub_topics" {
  description = "Map of Pub/Sub topics to create"
  type        = map(object({
    labels = optional(map(string), {})
  }))
  default = {
    "athlete-sessions" = {
      labels = {
        environment = "local"
        domain      = "athlete"
      }
    }
    "running-events" = {
      labels = {
        environment = "local"
        domain      = "running"
      }
    }
    "payment-events" = {
      labels = {
        environment = "local"
        domain      = "payment"
      }
    }
    "coach-notifications" = {
      labels = {
        environment = "local"
        domain      = "coach"
      }
    }
  }
}

variable "pubsub_subscriptions" {
  description = "Map of Pub/Sub subscriptions to create"
  type        = map(object({
    topic           = string
    ack_deadline    = optional(number, 10)
    retention_days  = optional(number, 7)
    labels          = optional(map(string), {})
  }))
  default = {
    "athlete-sessions-worker" = {
      topic          = "athlete-sessions"
      ack_deadline   = 30
      retention_days = 7
      labels = {
        environment = "local"
        worker      = "athlete-consumer"
      }
    }
    "running-events-processor" = {
      topic          = "running-events"
      ack_deadline   = 60
      retention_days = 7
      labels = {
        environment = "local"
        worker      = "running-processor"
      }
    }
    "payment-webhook-handler" = {
      topic          = "payment-events"
      ack_deadline   = 20
      retention_days = 7
      labels = {
        environment = "local"
        worker      = "payment-handler"
      }
    }
  }
}

# Cloud Storage configuration
variable "storage_buckets" {
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
  default = {
    "mr-training-local-uploads" = {
      location      = "US-CENTRAL1"
      storage_class = "STANDARD"
      versioning    = false
      labels = {
        environment = "local"
        purpose     = "uploads"
      }
    }
    "mr-training-local-assets" = {
      location      = "US-CENTRAL1"
      storage_class = "STANDARD"
      versioning    = true
      labels = {
        environment = "local"
        purpose     = "assets"
      }
    }
    "mr-training-local-backups" = {
      location      = "US-CENTRAL1"
      storage_class = "COLDLINE"
      versioning    = true
      labels = {
        environment = "local"
        purpose     = "backups"
      }
      lifecycle_rules = [{
        action = "Delete"
        condition = {
          age = 90
        }
      }]
    }
  }
}

# IAM configuration (if supported by Floci)
variable "iam_service_accounts" {
  description = "Map of IAM service accounts to create"
  type        = map(object({
    display_name = string
    description  = optional(string, "")
    labels       = optional(map(string), {})
  }))
  default = {
    "mr-training-api" = {
      display_name = "MR Training API Service Account"
      description  = "Service account for MR Training API backend"
      labels = {
        environment = "local"
        component   = "api"
      }
    }
  }
}