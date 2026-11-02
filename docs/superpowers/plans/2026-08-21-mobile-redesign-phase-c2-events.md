# Mobile Redesign — Phase C2 Event Registration (RSVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an athlete view a single event's full detail (date/time/location/mode/list items) and register for it: accept or cancel attendance, and fill in the coach-defined dynamic form (option list, checklist, or free fields) from `event_form_fields`. This requires a `event_registrations` table with status, a `event_form_responses` table to persist athlete answers, and new API endpoints for detail + RSVP + form submit. Mobile gets an `EventDetailScreen` with a dynamic form rendered by field kind.

**Architecture:** Today the athlete events list returns events with optional `format`, `formFields` (from `event_form_fields`), `listItems` (from `event_list_items`), and `running`, but there is **no** event-detail endpoint, **no** registration endpoint, and **no** table storing athlete submissions. We add `event_registrations` (event_id + athlete_id + status accepted/cancelled + submitted payload) and `event_form_responses` (one row per free-text field answer), plus `GET /api/athlete/events/[id]` (detail incl. the athlete's registration state), `POST /api/athlete/events/[id]/respond` (accept/cancel + optional form answers). The `event_athletes` table from migration 002 (invite/assignment set) stays as-is; registration status is tracked separately so a coach-assigned attendee must still confirm. Mobile renders the detail with a dynamic form driven by `formFields[].kind`.

**Tech Stack:** Next.js API routes (`apps/web`, Clerk auth, `@libsql/client`), SQL migrations (`apps/web/migrations`), Expo SDK 54 mobile (`apps/mobile`, npm, TS strict, React Query, Volt tokens + UI kit). Package manager for mobile is npm; backend is tracked in the parent repo.

**Source spec:** `docs/superpowers/specs/2026-08-21-mobile-redesign-design.md` §5.2.

**Key decisions:**
1. Registration state is a NEW table (`event_registrations`) rather than adding columns to `event_athletes` — keeps the coach-assigned invite set (event_athletes) independent of the athlete's own accept/cancel decision.
2. Form answers store free-text responses in `event_form_responses` (event_id + athlete_id + field_id + value) so a future web coach view can read them; they are submitted atomically with accept/respond.
3. The athlete's current registration state is returned with the detail so the mobile UI can show "Aceptar / Cancelar / Ya confirmado" and prefill submitted answers.
4. Idempotency: re-accepting an already-accepted event just updates form answers (upsert), returning the existing registration; cancelling removes the accept status (or sets to cancelled) but keeps submitted answers for potential re-attendance.

**Ground truth (verified):**
- `GET /api/athlete/events` (`apps/web/src/app/api/athlete/events/route.ts`) returns a raw array; each event has `id, title, date, time, endTime, type, modality, location, description, status, athleteIds, public` plus optional `format`, `formFields` (`[{id,label,kind,options,required}]`), `listItems` (`string[]`), `running` (`{distanceKm,pace,meetingPoint}`).
- `event_form_fields` columns (migration 002): id, event_id, label, kind, options (JSON), required, sort_order. `event_list_items`: id, event_id, item, sort_order. `event_athletes`: event_id+athlete_id composite (invite/assignment set, no status).
- No `event_registrations`, no `event_form_responses`, no detail/respond route.

---

## Task 0 — DB migration: event_registrations + event_form_responses

**Files:**
- Create: `apps/web/migrations/008_event_registrations.sql` (confirm next available number; 007 was taken by C1 — use 008, or 009 if an 008 exists)

- [ ] Create `apps/web/migrations/008_event_registrations.sql`:

```sql
-- Phase C2: athlete registration state for an event, plus free-text form answers
-- submitted by the athlete against the coach-defined event_form_fields.

CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  status TEXT NOT NULL,               -- 'accepted' | 'cancelled'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_form_responses (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  field_id TEXT NOT NULL,             -- matches event_form_fields.id
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registration_event_athlete ON event_registrations(event_id, athlete_id);
CREATE INDEX IF NOT EXISTS idx_form_response_event_athlete ON event_form_responses(event_id, athlete_id);
```

- [ ] This is manual-apply (no migrate script). Confirm the next filename number against `apps/web/migrations/` before writing.
- [ ] Commit: `feat(web): add event registration and form-response schema`

## Task 1 — DB helpers for event detail + registration

**Files:**
- Modify: `apps/web/src/lib/coaching-db.ts`

- [ ] Add these exports (adapt to existing row-mapping style, parameterized queries; `events` row columns from the list route — read `getEvents` in coaching-db.ts and the list route to mirror the exact event row shape):

```ts
export type EventRegistration = {
  id: string;
  eventId: string;
  athleteId: string;
  status: 'accepted' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type EventFormResponse = {
  id: string;
  eventId: string;
  athleteId: string;
  fieldId: string;
  value: string;
  createdAt: string;
};

// Returns full event detail incl. listItems, formFields (sorted by sort_order), and running if present.
// formFields items: { id, label, kind, options, required }.
export async function getEventDetail(eventId: string): Promise<{ event: any; listItems: string[]; formFields: { id: string; label: string; kind: string; options: unknown; required: number }[]; running: any | null } | null> {
  // SELECT event by id; SELECT event_list_items ORDER BY sort_order; SELECT event_form_fields ORDER BY sort_order; SELECT running by event_id if a running table/row exists.
}

export async function getEventRegistration(eventId: string, athleteId: string): Promise<EventRegistration | null> {
  // SELECT * FROM event_registrations WHERE event_id = ? AND athlete_id = ? LIMIT 1.
}

export async function getEventFormResponses(eventId: string, athleteId: string): Promise<EventFormResponse[]> {
  // SELECT * FROM event_form_responses WHERE event_id = ? AND athlete_id = ?.
}

export async function upsertEventRegistration(eventId: string, athleteId: string, status: 'accepted' | 'cancelled'): Promise<EventRegistration> {
  // INSERT ... ON CONFLICT(event_id, athlete_id) DO UPDATE SET status = ?, updated_at = now. Requires a UNIQUE(event_id, athlete_id) on event_registrations — add UNIQUE in the migration (ALTER to add if needed). Return the row.
}

export async function replaceEventFormResponses(eventId: string, athleteId: string, responses: { fieldId: string; value: string }[]): Promise<void> {
  // DELETE existing responses for event+athlete, then INSERT the new ones.
}
```

- [ ] **Important:** ensure `event_registrations` has a UNIQUE constraint on `(event_id, athlete_id)` for the upsert to work. If the migration in Task 0 didn't add it, add `CREATE UNIQUE INDEX IF NOT EXISTS uniq_registration_event_athlete ON event_registrations(event_id, athlete_id);` to the migration. Verify the events row shape matches what the list route returns (read `getEvents`).
- [ ] Run `cd apps/web && npx tsc --noEmit` — EXPECT PASS (note: profile route TS is fixed, so should be clean).
- [ ] Commit: `feat(web): add event detail and registration DB helpers`

## Task 2 — GET /api/athlete/events/[id] (detail)

**Files:**
- Create: `apps/web/src/app/api/athlete/events/[id]/route.ts`

- [ ] Mirror the auth pattern (Clerk `auth()` → `getAthleteByClerkId`). GET: resolve athlete, `getEventDetail(id)` → 404 if null; `getEventRegistration(id, athlete.id)` → registration may be null (not yet responded); `getEventFormResponses(id, athlete.id)`. Return `{ event, listItems, formFields, running, registration, responses }` (registration null if none, responses array). Ownership: events are coach-scoped but any linked athlete can see them — no per-athlete ownership gate needed beyond auth (the existing list route returns the athlete's coach's events). Keep it consistent with the list route.
- [ ] Commit: `feat(web): add athlete event detail endpoint`

## Task 3 — POST /api/athlete/events/[id]/respond

**Files:**
- Create: `apps/web/src/app/api/athlete/events/[id]/respond/route.ts`

- [ ] POST body `{ status: 'accepted' | 'cancelled', answers?: { fieldId: string; value: string }[] }`. Verify event exists (getEventDetail → 404). Resolve athlete. Call `upsertEventRegistration(id, athlete.id, status)`. If `answers` provided and status === 'accepted', call `replaceEventFormResponses(id, athlete.id, answers)`. Return `{ registration }` (201). Validate status ∈ ['accepted','cancelled'] else 400; if answers has entries with unknown fieldId (not in event.formFields), 400.
- [ ] Commit: `feat(web): add athlete event registration endpoint`

## Task 4 — Mobile: EventDetailScreen with dynamic form

**Files:**
- Create: `apps/mobile/src/features/events/presentation/screens/EventDetailScreen.tsx`

- [ ] `NativeStackScreenProps<RootStackParamList, 'EventDetail'>`; route param `{ eventId }`. useQuery key `['event-detail', eventId]` → `GET /athlete/events/[id]` returning `{ event, listItems, formFields, running, registration, responses }`. `ScreenHeader title={event.title ?? 'Evento'} onBack={() => goBack()}`.
- Sections (all `Card` based, tokens/kit):
  - Info card: date/time/endTime, modality, location, description, `type` badge. Use `Badge` for type.
  - If `listItems.length` → a list card rendering each item (checkboxes-style? they're just "list" for reading) — render as text rows with a bullet.
  - If `running` → a "Números" card: distanceKm, pace, meetingPoint.
  - If `formFields.length` → dynamic form card: for each field render by `kind`:
    - `'select'`/`'option'` → render the `options` array as selectable pills (single-choice; `PrimaryButton`-tinted chips). value from `responses` prefill.
    - `'checkbox'`/`'multi'` → render options as toggleable chips (multi-select), value from responses.
    - `'text'`/`'number'`/other → `Input` (text/numeric) prefilled.
    - Required fields enforce non-empty on submit (show inline `Input` error or a small message).
  - Registration CTA at bottom: if `registration?.status === 'accepted'` → show "Confirmado" + a "Cancelar asistencia" secondary button (POST respond status 'cancelled'); else → `<PrimaryButton label="Aceptar evento" />` (validates required fields, POST respond status 'accepted' with collected answers). If `registration?.status === 'cancelled'` → show "Aceptar de nuevo" button.
  - Loading/error/empty via `EmptyState`. No raw hex/darkTheme.
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS; `npx jest` still green.
- [ ] Commit: `feat(mobile): add event detail screen with dynamic registration form`

## Task 5 — Navigation + events card wiring

**Files:**
- Modify: `apps/mobile/src/navigation/Navigation.tsx`
- Modify: `apps/mobile/src/features/events/presentation/screens/EventsScreen.tsx`

- [ ] Add `EventDetail: { eventId: string }` to `RootStackParamList` and register `EventDetail` as a full-screen `Stack.Screen` in the signed-in stack.
- [ ] In `EventsScreen.tsx`, make each event card pressable → `navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('EventDetail', { eventId: ev.id })` (follow the ProfileScreen/HistoryScreen typing convention).
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `feat(mobile): wire event detail into navigation`

## Task 6 — Final verification

- [ ] `cd apps/web && npx tsc --noEmit` — EXPECT PASS.
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS; `npx jest` — EXPECT PASS (all suites).
- [ ] Grep no raw hex/darkTheme in the new screen: `grep -rnE "darkTheme|#[0-9a-fA-F]{3,8}" apps/mobile/src/features/events/presentation/screens/EventDetailScreen.tsx` → 0.
- [ ] Cross-check route names/shapes between web routes and mobile apiClient calls.
- [ ] Commit: `chore: verify phase C2 event registration`

---

## Post-conditions

- `GET /api/athlete/events/[id]` returns `{ event, listItems, formFields, running, registration, responses }`.
- `POST /api/athlete/events/[id]/respond` upserts registration and stores form answers; re-accept is idempotent.
- `EventDetailScreen` shows full detail, renders dynamic form by `formFields[].kind`, accepts/cancels attendance, prefills previous answers, enforces required fields.
- `npx tsc --noEmit` green in both apps; mobile jest green; event cards navigate to detail.
