# MR Training - Terraform Infrastructure

Infrastructure as Code for MR Training using Terraform with Floci GCP Emulator.

## ⚠️ FASE 2 Status: PARTIALLY COMPLETE - AUTHENTICATION BLOCKER

| Criterion | Result |
|-----------|--------|
| Terraform init, fmt, validate, plan | ✅ **PASS** |
| Modules (Secret Manager, Pub/Sub, Storage, IAM) | ✅ **Static validation PASS** |
| Floci health check | ✅ **PASS** |
| `terraform apply` (resource creation) | ❌ **BLOCKED** |
| Plan idempotency | ✅ **PASS** |
| Production GCP validation | ⏳ **PENDING** |

**Root Cause**: Google Provider v6.x expects OAuth2 service account token exchange, but Floci's token endpoint returns `400 Bad Request: uploadId is required`. Terraform modules are production-ready for real GCP but cannot create resources in Floci.

**Workaround**: Use `gcloud` CLI directly against Floci for local resource management (see [Local Development](#local-development-workaround)).

---

## Architecture

```
infrastructure/terraform/
├── modules/
│   ├── secret-manager/    # Secret Manager secrets and versions
│   ├── pubsub/           # Pub/Sub topics and subscriptions
│   ├── storage/          # Cloud Storage buckets
│   └── iam/              # IAM service accounts
├── environments/
│   ├── local/            # Local development (Floci) ✅ VALIDATES
│   ├── qa/               # QA environment (prepared)
│   └── production/       # Production environment (prepared)
├── DECISIONS.md          # Architecture Decision Records
└── README.md
```

## Prerequisites

- Terraform >= 1.17.0
- Floci GCP emulator running on `localhost:4588`
- Docker (for Floci)
- gcloud CLI (for local resource management workaround)

## Quick Start (Local)

```bash
# 1. Start Floci GCP emulator (if not already running)
docker run -d --name floci-gcp \
  -p 4588:4588 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  floci/floci-gcp:latest

# 2. Verify Floci is healthy
curl http://localhost:4588/health

# 3. Initialize Terraform
cd infrastructure/terraform/environments/local
make terraform-init

# 4. Validate configuration
make terraform-validate

# 5. Plan changes (works - shows 16 resources to create)
make infra-plan

# 6. Apply to Floci (BLOCKED - authentication incompatibility)
# make infra-apply  # ❌ FAILS with CREDENTIALS_MISSING

# 7. Workaround: Use gcloud CLI directly (see below)
```

## Local Development Workaround

Since Terraform apply is blocked by authentication incompatibility, use gcloud CLI directly:

### Secret Manager
```bash
# Create secrets
gcloud secrets create mr-training-local-db-password \
  --project=floci-local \
  --data-file=- <<< "local-password"

gcloud secrets create mr-training-local-clerk-secret-key \
  --project=floci-local \
  --data-file=- <<< "local-clerk-secret"

gcloud secrets create mr-training-local-wompi-private-key \
  --project=floci-local \
  --data-file=- <<< "local-wompi-key"

# List secrets
gcloud secrets list --project=floci-local
```

### Pub/Sub
```bash
# Create topics
gcloud pubsub topics create mr-training-local-athlete-sessions --project=floci-local
gcloud pubsub topics create mr-training-local-running-events --project=floci-local
gcloud pubsub topics create mr-training-local-payment-events --project=floci-local
gcloud pubsub topics create mr-training-local-coach-notifications --project=floci-local

# Create subscriptions
gcloud pubsub subscriptions create athlete-sessions-worker \
  --topic=mr-training-local-athlete-sessions --project=floci-local

gcloud pubsub subscriptions create running-events-processor \
  --topic=mr-training-local-running-events --project=floci-local

gcloud pubsub subscriptions create payment-webhook-handler \
  --topic=mr-training-local-payment-events --project=floci-local
```

### Cloud Storage
```bash
# Create buckets
gcloud storage buckets create gs://mr-training-local-uploads \
  --project=floci-local --location=US-CENTRAL1

gcloud storage buckets create gs://mr-training-local-assets \
  --project=floci-local --location=US-CENTRAL1 --versioning

gcloud storage buckets create gs://mr-training-local-backups \
  --project=floci-local --location=US-CENTRAL1 --versioning --default-storage-class=COLDLINE
```

## Make Commands

From `infrastructure/terraform/environments/local/`:

```bash
make terraform-init       # Initialize Terraform (download providers)
make terraform-fmt        # Format Terraform files
make terraform-validate   # Validate configuration
make infra-plan           # Show execution plan (WORKS)
make infra-apply          # Apply to Floci (BLOCKED)
make infra-output         # Show outputs
make verify-floci         # Check Floci connectivity
make validate-all         # Run full validation pipeline
make clean                # Clean Terraform cache
```

## Resources Defined (Ready for Real GCP)

### Secret Manager
- `mr-training-local-db-password`
- `mr-training-local-clerk-secret-key`
- `mr-training-local-wompi-private-key`

### Pub/Sub Topics
- `mr-training-local-athlete-sessions`
- `mr-training-local-running-events`
- `mr-training-local-payment-events`
- `mr-training-local-coach-notifications`

### Pub/Sub Subscriptions
- `mr-training-local-athlete-sessions-worker`
- `mr-training-local-running-events-processor`
- `mr-training-local-payment-webhook-handler`

### Cloud Storage Buckets
- `mr-training-local-uploads` (STANDARD, no versioning)
- `mr-training-local-assets` (STANDARD, versioning enabled)
- `mr-training-local-backups` (COLDLINE, versioning, 90-day lifecycle)

### IAM Service Accounts (Experimental)
- `mr-training-local-mr-training-api`

## Floci Configuration

The local environment uses these Floci-specific settings via environment variables:

```bash
# Project
GOOGLE_PROJECT=floci-local
GOOGLE_CLOUD_PROJECT=floci-local

# Access token (any non-empty string works with Floci)
GOOGLE_OAUTH_ACCESS_TOKEN=floci-local-token

# Region
GOOGLE_REGION=us-central1

# Endpoint overrides for all GCP services (all point to Floci on port 4588)
GOOGLE_API_ENDPOINT_OVERRIDES_SECRETMANAGER=http://localhost:4588
GOOGLE_API_ENDPOINT_OVERRIDES_PUBSUB=http://localhost:4588
GOOGLE_API_ENDPOINT_OVERRIDES_STORAGE=http://localhost:4588
# ... all services on same endpoint

# Emulator host variables (for client libraries that use them)
STORAGE_EMULATOR_HOST=http://localhost:4588
PUBSUB_EMULATOR_HOST=localhost:4588
FIRESTORE_EMULATOR_HOST=localhost:4588
DATASTORE_EMULATOR_HOST=localhost:4588
SECRET_MANAGER_EMULATOR_HOST=http://localhost:4588
```

## Safety Features

1. **Project ID Validation**: Enforces `floci-local` to prevent real GCP operations
2. **Local Backend**: State stored in `terraform.tfstate.local` (gitignored)
3. **No Real Credentials**: Uses dummy token `floci-local-token`
4. **Endpoint Override**: All GCP APIs point to localhost:4588

## Limitations

| Service | Terraform Status | gcloud Workaround |
|---------|------------------|-------------------|
| Secret Manager | ❌ Blocked (auth) | ✅ Works |
| Pub/Sub | ❌ Blocked (auth) | ✅ Works |
| Cloud Storage | ❌ Blocked (auth) | ✅ Works |
| IAM | ❌ Blocked (auth) | ⚠️ Limited |

## State Management

- Local state file: `terraform.tfstate.local`
- Never commit state files
- Each environment has isolated state

## Next Steps

1. **Phase 3**: Infisical integration for secret values
2. **Phase 4**: Kubernetes local (k3d) + Argo CD
3. **Phase 5**: CI/CD with GitHub Actions
4. **Production Validation**: Deploy Terraform modules to real GCP project

## Decision Records

See [DECISIONS.md](./DECISIONS.md) for detailed architecture decisions:
- ADR-001: Terraform with Floci - Authentication Limitation
- ADR-002: Secret Management Strategy
- ADR-003: Floci GCP Emulator Usage