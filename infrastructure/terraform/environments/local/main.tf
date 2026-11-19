# Terraform Configuration for MR Training - Local Environment
# Uses Floci GCP emulator running on localhost:4588
# This configuration MUST NOT be used against real GCP projects

terraform {
  required_version = ">= 1.17.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }
  }

  # Local backend for development - state persists between runs
  backend "local" {
    path = "../../terraform.tfstate.local"
  }
}

variable "access_token" {
  description = "Access token for Floci (any non-empty string works locally)"
  type        = string
  sensitive   = true
  default     = "floci-local-token"
}

# Provider configuration for Floci GCP emulator
# Using static access token for authentication (Floci accepts any token)
# Endpoint overrides are set via GOOGLE_API_ENDPOINT_OVERRIDES_* environment variables
provider "google" {
  project      = var.project_id
  region       = var.region
  access_token = var.access_token
}

provider "google-beta" {
  project      = var.project_id
  region       = var.region
  access_token = var.access_token
}

# HTTP provider for Floci health check
provider "http" {}

# Data source to verify Floci is reachable
data "http" "floci_health" {
  url = "${var.floci_endpoint}/health"

  request_headers = {
    Accept = "application/json"
  }
}

# Output Floci health status for verification
output "floci_status" {
  description = "Floci GCP emulator health status"
  value       = data.http.floci_health.response_body
}