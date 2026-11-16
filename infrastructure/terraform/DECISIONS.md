# Architecture Decision Records - MR Training Infrastructure

## ADR-001: Terraform with Floci GCP Emulator - Authentication Limitation

**Date**: 2026-11-14
**Status**: Documented - Not Resolved
**Context**: Attempting to use Terraform Google Provider v6.x with Floci GCP emulator for local infrastructure development.

### Decision
Terraform configuration validates and plans successfully, but `terraform apply` fails due to authentication incompatibility between Google Provider v6.x OAuth2 flow and Floci's token endpoint.

### Technical Details

| Component | Version | Status |
|-----------|---------|--------|
| Terraform | 1.17.0 | ✅ Works |
| Google Provider | 6.50.0 | ✅ Validates |
| Floci GCP | 0.10.0 | ✅ Running |
| Authentication | OAuth2/JWT | ❌ Incompatible |

### Root Cause
Google Provider v6.x:
1. Requires service account credentials (`credentials` argument)
2. Signs JWT with private key
2. Calls token endpoint (`oauth2/token`) to exchange for access token
3. Expects standard OAuth2 client credentials flow

Floci GCP 0.10.0:
1. Token endpoint expects STS token exchange format
2. Returns `400 Bad Request: uploadId is required` for standard OAuth2 requests
3. Accepts any token via `GOOGLE_OAUTH_ACCESS_TOKEN` for API calls
4. Does not implement full OAuth2 token exchange for service accounts

### Workaround
For local development, use Floci CLI / gcloud directly:
```bash
# Secret Manager
gcloud secrets create <name> --project=floci-local --data-file=-

# Pub/Sub
gcloud pubsub topics create <name> --project=floci-local

# Cloud Storage
gcloud storage buckets create gs://<name> --project=floci-local
```

### Future Validation
Terraform modules are **production-ready for real GCP** - they just need:
- Real GCP project
- Real service account with proper IAM roles
- Real endpoint (no overrides)

### Files Affected
- `infrastructure/terraform/environments/local/main.tf` - Provider config with auth workaround
- `infrastructure/terraform/modules/*` - All modules validate statically
- `infrastructure/terraform/README.md` - Updated with limitation documentation

---

## ADR-002: Secret Management Strategy

**Date**: 2026-11-14
**Status**: Proposed - Pending FASE 3 Implementation

### Decision
Separation of concerns:
- **Infisical**: Central secret store (development, QA, production)
- **Terraform**: Infrastructure declaration only (no secret values in state)
- **GCP Secret Manager**: Runtime secret destination for GCP deployments
- **Application**: Loads from Infisical at startup (with caching)

### Rationale
1. Terraform state should never contain secret values
2. Infisical provides audit trail, rotation, environment separation
3. GCP Secret Manager is the target for production workloads
4. Application reads from single source (Infisical) with fallback behavior

---

## ADR-003: Floci GCP Emulator Usage

**Date**: 2026-11-14
**Status**: Active

### Decision
Use Floci for local service emulation where compatible:
- ✅ Secret Manager (via gcloud/CLI)
- ✅ Pub/Sub (via gcloud/CLI)
- ✅ Cloud Storage (via gcloud/CLI)
- ❌ Terraform provider authentication (documented limitation)

### Services Not Used Locally
- Cloud Run (requires Docker socket, complex local setup)
- Cloud SQL (use local PostgreSQL instead)
- GKE (use k3d in FASE 4)
- IAM (limited in Floci, use real GCP for validation)