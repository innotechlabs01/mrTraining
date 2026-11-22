# T-018: Cloudflare R2 Signed Media Upload & Retrieval

**Status:** In Progress  
**Board:** `BOARD.md` (`T-018`)  
**Roles:** `architect` -> `dev-database` -> `dev-backend` -> `dev-front` + `dev-react-native` -> `qa` -> `code-reviewer` -> `security-hacker` -> `USER GATE`

---

## 1. Objective

Replace all Vercel Blob (`@vercel/blob`), Go API local disk (`./uploads/`), and inline base64 `data:` URI media flows with a unified **Cloudflare R2** private object storage architecture:
- **Coach Web (Vercel)** requests an authenticated presigned `PUT` URL via Vercel Next.js (`/api/media/presign-upload` -> Go API) and uploads images/videos **directly from the browser to Cloudflare R2** (0 media bytes buffered on Vercel or Go API).
- **Mobile (React Native)** and **Web** resolve canonical `r2://<object_key>` references into short-lived authenticated presigned `GET` URLs via `POST /api/v1/media/presign-read` (or `GET /public/media/view?key=...` for `visibility = 'public'` assets) to stream/display videos and images securely.

---

## 2. Architecture Decision

1. **Private R2 Bucket**: Bucket remains 100% private (no public `r2.dev` or public `GetObject`).
2. **API-First Signing**:
   - **Go API (`apps/api`)** is the single authoritative R2 S3-compatible presigner, `media_objects` registry, RBAC/IDOR guard, and read-URL signer.
   - **Vercel Next.js (`apps/web`)** exposes thin Clerk-authenticated BFF routes (`/api/media/presign-upload`, `/api/media/confirm`, `/api/media/presign-read`) forwarding only small JSON payloads via `goFetchServer`.
3. **Canonical Reference (`r2://<object_key>`)**:
   - Database columns (`video_url`, `image_url`, `media_url`, `avatar_url`, landing JSON) store `r2://<object_key>`.
   - Domain endpoints remain cache-safe (Redis/ETags) and never store expiring `?X-Amz-Signature=...` URLs.
   - Clients resolve `r2://...` via `POST /api/v1/media/presign-read` (60m TTL, cached 45m in React Query, excluded from MMKV persistence).
4. **Backward Compatibility**:
   - `https://...` / `http://...` URLs pass through untouched.
   - `/uploads/...` paths continue resolving to `${GO_API_URL}/uploads/...` (read-only fallback).
   - Legacy multipart upload endpoints (`form-recordings/upload`, `challenges/attempts/:id/video`) accept JSON `{ video_url: "r2://..." }` as primary and stream any legacy multipart directly to R2.

---

## 3. Ordered Decomposition

### Subtask 1 — Database Schema & RLS (`dev-database`)
- `apps/api/migrations/postgres/435_media_objects.sql`: `media_objects` table, indexes, `ENABLE`/`FORCE ROW LEVEL SECURITY`, tenant/owner/public/admin policies, and `GRANT` to `mr_training_app`.
- Verify with `bash scripts/migrate-all.sh`.

### Subtask 2 — Backend Go R2 Storage, Media API & Write Guards (`dev-backend`)
- `apps/api/go.mod` / `go.sum`: `github.com/aws/aws-sdk-go-v2` + `service/s3` + `credentials`.
- `apps/api/internal/config/config.go`: R2 config fields (`R2AccountID`, `R2AccessKeyID`, `R2SecretAccessKey`, `R2Bucket`, `R2Endpoint`, TTLs, max sizes).
- `apps/api/internal/infrastructure/storage/r2.go`: `ObjectStorage` interface & `R2Client` (`Region: "auto"`, `UsePathStyle: true`, `RequestChecksumCalculationWhenRequired`, `ResponseChecksumValidationWhenRequired`).
- `apps/api/internal/pkg/mediautil/`: shared magic-byte validation.
- `apps/api/internal/domain/media/`, `infrastructure/media/`, `application/media/`, `interfaces/http/dto/media.go`, `handlers/media.go`:
  - `POST /api/v1/media/presign-upload`
  - `POST /api/v1/media/confirm` (HeadObject + 512B Range magic-byte check)
  - `POST /api/v1/media/presign-read` (batched up to 50 refs, RBAC/tenant/ticket/public authz)
  - `GET /api/v1/media/signed-url`
  - `DELETE /api/v1/media/:id`
  - `GET /public/media/view?key=...` (`307` redirect only for `visibility = 'public' AND status = 'ready'`)
- `apps/api/internal/pkg/validator/validator.go`: `isValidMediaRefOrURL()` accepting `http://`, `https://`, `r2://...`.
- Domain write guards (`training.go`, `challenge.go`, `formrecording.go`, `blog.go`, `product.go`, `coachfeed.go`, `support.go`, `user.go`, `landing.go`, `coach_landing.go`).

### Subtask 3 — Frontend Web & Vercel Auth Signing (`dev-front`)
- Vercel BFF routes: `apps/web/src/app/api/media/presign-upload/route.ts`, `confirm/route.ts`, `presign-read/route.ts`.
- `apps/web/src/lib/media/r2-upload.ts` & `apps/web/src/hooks/useSignedMediaUrl.ts`.
- `apps/web/next.config.js` (CSP `connect-src` for `https://*.r2.cloudflarestorage.com`) & `apps/web/src/components/landing/data.ts` (`mediaUrl` for `r2://`).
- Migrate uploaders/previews: `client.ts`, `ExerciseLibrary.tsx`, `coach/challenges/page.tsx`, `coach/landing/page.tsx`, `BlockInspector.tsx`, `ProductDialog.tsx` (both), `BlogEditorDialog.tsx`, `coach/support/page.tsx`, `admin/tickets/page.tsx`, `ProfileSetupForm.tsx`.
- Retire `@vercel/blob` from `apps/web/package.json` and return `410 Gone` on `/api/exercises/upload` & `/api/coach/challenge-videos/upload`.

### Subtask 4 — Mobile React Native Signed Read & Direct Upload (`dev-react-native`)
- `apps/mobile/src/shared/media/mediaService.ts` & `useSignedMediaUrl.ts`.
- `apps/mobile/src/infrastructure/storage/queryCachePersister.ts` (exclude `['media', 'signed', ...]` from MMKV).
- `isPlayableVideoUrl.ts`, `videoState.ts`, `TrackedVideoPlayer.tsx`, `ExerciseVideoPlayer.tsx`, `ExerciseDemoModal.tsx`.
- Screens & uploaders: `WorkoutDetailScreen.tsx`, `WorkoutExecutionScreen.tsx`, `ChallengeDetailScreen.tsx`, `ChallengeVideoDemo.tsx`, `TicketChatScreen.tsx`, `StoreScreen.tsx`, `TodayExtraSections.tsx`, `CoachFeedScreen.tsx`, `challengeService.ts`, `FormRecordingSync.ts`, `useVideoUpload.ts`.

---

## 4. Acceptance Criteria

1. **Zero Bytes on Vercel / Go Disk**: Uploading video/image from Coach Web sends only JSON to Vercel `/api/media/presign-upload`, uploads directly via `PUT` to R2, and confirms via `/api/media/confirm`; no file is written to Vercel Blob or `./uploads/`.
2. **Private Bucket Enforcement**: Raw R2 URL without SigV4 returns `403`; `presign-read` without Clerk JWT returns `401`.
3. **IDOR / Tenant Isolation**: Cross-tenant `presign-read` or attaching another user's `r2://` key is rejected; `/public/media/view` returns `403`/`404` for non-public keys.
4. **Magic-Byte & Size Validation**: `presign-upload` rejects disallowed MIME/size; `confirm` deletes R2 object and returns `400` if 512B magic-byte check fails.
5. **Mobile Signed Playback & Caching**: Mobile screens resolve `r2://` via `presign-read`, stream/render via `expo-video`/`expo-image`, and never persist signed URLs in MMKV.
6. **Mobile Direct Upload**: Challenge recording & form recording upload directly to R2 via `FileSystem.uploadAsync` `PUT` and persist `r2://...`.
7. **Backward Compatibility**: Existing `https://...` and `/uploads/...` URLs continue rendering in Web and Mobile.
8. **Build & Tests**: `go build ./...`, `go test -p 1 ./internal/... -race -count=1`, `pnpm lint && pnpm test && pnpm build`, `npm run typecheck && npm test` all pass.
