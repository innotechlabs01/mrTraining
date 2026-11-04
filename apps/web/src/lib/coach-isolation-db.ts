import { getDB } from './db'

export { getDB }

// Deprecated: direct SQL helpers moved to the Go API.
// Coaches/provisioning: POST /webhooks/clerk (Clerk webhook) + Go API.
// Coach code validation: POST /api/v1/invites/validate (Go).
// Invite acceptance: POST /api/v1/invites/accept (Go).
// Coach invite: POST /api/v1/coach/invite (Go).
// This file now only re-exports getDB for callers not yet migrated.
