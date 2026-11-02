# Delta for Unified API Gateway

## ADDED Requirements

### Requirement: Single Go API Entry Point

The system MUST expose all web and mobile used endpoints under `/api/v1/*` on Go backend.

#### Scenario: Coach dashboard parity
- GIVEN authenticated coach
- WHEN GET `/api/v1/coach/dashboard/summary`
- THEN returns roster metrics matching legacy Next.js aggregation
