# MR Training — Coding Standards

**Version 1.0 — 2026**

---

## Table of Contents

1. [General Principles](#1-general-principles)
2. [TypeScript & React](#2-typescript--react)
3. [Go](#3-go)
4. [Dart & Flutter](#4-dart--flutter)
5. [SQL](#5-sql)
6. [CSS & Tailwind](#6-css--tailwind)
7. [Git & Version Control](#7-git--version-control)
8. [Code Review](#8-code-review)

---

## 1. General Principles

### 1.1 Universal Rules

These rules apply to every language, every file, every commit:

**Readability before cleverness.** Code is read 10x more than it is written. Optimize for the reader — your teammate six months from now, debugging a production incident at 3 AM. A straightforward, slightly verbose solution is always preferred over a terse, "clever" one that requires a 10-minute explanation.

**Meaningful names.** Variables, functions, types, and files must be self-documenting. A name should answer "what does this do?" without requiring a comment. `calculateAcuteChronicWorkloadRatio()` is good. `calcACWR()` is acceptable only if the acronym is universally understood in context. `processData()` is never acceptable.

**One responsibility per unit.** A function does one thing. A file contains one concept. A package/module exports one domain. If you need "and" to describe what something does, split it — "fetchUserData AND validatePermissions" should be two functions called in sequence, not one function that does both.

**No magic numbers.** Every numeric literal that is not obviously self-explanatory (0, 1, 2, -1) must be assigned to a named constant. `if (workout.rpe > 8)` is acceptable — RPE is a well-known 1-10 scale. `if (athlete.age > 18)` is acceptable — age 18 is universally understood. `if (score > 0.75)` is not — what does 0.75 represent? `const ANOMALY_THRESHOLD = 0.75` and then `if (score > ANOMALY_THRESHOLD)` is correct.

**Early returns over deep nesting.** The "happy path" should be the least-indented code. Validate preconditions at the top and return early. Nested `if` blocks beyond 3 levels should be refactored.

**No commented-out code.** Old code lives in version control. Commented-out code is noise. Delete it. If you need to reference how something used to work, look at the git history.

**Comments explain why, not what.** The code explains what. If the code doesn't clearly explain what, rewrite the code — don't patch it with a comment. Comments are for explaining intent, architectural decisions, known edge cases, and references to external documentation or issue trackers.

**Imports organized.** Group imports in this order: standard library, third-party packages, internal packages. Within each group, alphabetical order. No circular imports. Many languages enforce this with tooling — use the tooling.

**Error messages are for users.** Error messages displayed to end users should describe what happened and suggest next steps in plain language. Error messages in logs should include context for debugging (request ID, user ID, input values). Never expose stack traces, database error messages, or internal state to end users.

### 1.2 File Organization

- Maximum 300 lines per file. Files exceeding this should be split into multiple modules.
- Maximum 50 lines per function. Functions exceeding this should be decomposed into smaller functions.
- One exported type/class/component per file (exceptions for tightly coupled helper types).
- File naming: kebab-case for TypeScript/JavaScript files, snake_case for Go files, snake_case for Dart files, snake_case for SQL migration files.
- Directory naming: lowercase, hyphens for multi-word (frontend), snake_case (backend).

### 1.3 Language-Specific Tooling

| Language | Formatter | Linter | Type Checker |
|----------|----------|--------|-------------|
| TypeScript | Biome | Biome | tsc --noEmit |
| Go | gofmt / goimports | golangci-lint | go vet |
| Dart | dart format | dart analyze | dart analyze |
| SQL | sql-formatter | squawk | N/A (database enforces) |
| CSS/Tailwind | Biome | Biome | N/A |
| Markdown | Prettier | markdownlint | N/A |

All formatting and linting is enforced in CI. A PR that fails linting cannot be merged. No exceptions.

---

## 2. TypeScript & React

### 2.1 TypeScript Configuration

TypeScript strict mode is enabled project-wide. The following compiler options are non-negotiable:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 2.2 Type Rules

- **No `any`.** Every variable, parameter, and return type must be explicitly typed. The only exception is third-party library callbacks where the type is genuinely unknowable, and even then, prefer `unknown` over `any`.
- **Prefer `unknown` over `any`.** If a value's type is genuinely unknown at compile time (e.g., parsed JSON from an API), type it as `unknown` and narrow with type guards before use.
- **Use `interface` for object shapes, `type` for unions and primitives.** `interface` for component props, API responses, domain models. `type` for `Status = 'active' | 'inactive'`, `type ID = string`.
- **No type assertions unless narrowing.** `as` casts are a code smell. Use type guards (`typeof`, `instanceof`, `in`, custom guard functions) to narrow types. Use `as` only when TypeScript's type inference is provably wrong (e.g., `document.getElementById` returning `HTMLElement` when you know it's `HTMLCanvasElement`).
- **Exhaustive switch statements.** Every `switch` over a union type must handle all cases or include a `default: assertNever(value)` branch.
- **Return types on exported functions.** Every exported function must declare its return type explicitly. This catches unintentional type drift in public APIs.
- **Discriminated unions for state.** Model component state, API responses, and domain state using tagged unions: `{ status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: Error }`.

### 2.3 React Rules

**Server Components by default.** Every component starts as a Server Component. Add `'use client'` only when the component requires interactivity (event handlers, hooks, browser APIs). Server Components should be the norm, Client Components the exception.

**Component structure:**
```typescript
// 1. Imports
import { memo } from 'react';
import { usePrograms } from '../hooks/usePrograms';
import { ProgramCard } from './ProgramCard';
import type { Program } from '../types';

// 2. Types
interface ProgramListProps {
  programs: Program[];
  onSelect?: (program: Program) => void;
}

// 3. Component
export function ProgramList({ programs, onSelect }: ProgramListProps) {
  if (programs.length === 0) {
    return <EmptyState title="No programs" description="Create your first training program" />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => (
        <ProgramCard key={program.id} program={program} onSelect={onSelect} />
      ))}
    </div>
  );
}
```

**Rules:**
- Components are functions, not classes. No class components.
- Use named exports, not default exports (better IDE support, consistent import naming).
- Extract reusable logic into hooks, not HOCs or render props.
- Props types defined as interfaces in the same file or in a sibling `types.ts`.
- Use `memo()` only when profiling proves it necessary — not as a default.
- Events handlers: `handle` prefix (`handleClick`, `handleSubmit`). Props callbacks: `on` prefix (`onClick`, `onSubmit`).
- No `useEffect` for data fetching — use TanStack Query or Server Components.
- No `useEffect` for derived state — compute it directly during render.
- No `useEffect` for event listeners — use the JSX event handler props or a dedicated hook.
- No props spreading unless wrapping a native HTML element with pass-through props.
- Children rendering: prefer composition (passing ReactNode as children) over prop-based configuration. Buttons accept `children` and `asChild`; layout components accept `children`.

### 2.4 Hooks Rules

- Custom hooks are prefixed with `use`: `useWorkouts`, `useDebounce`, `useMediaQuery`.
- Hooks return objects, not tuples (tuples don't scale beyond 2 values; objects are self-documenting).
- Hooks encapsulate a single concern. A hook that fetches programs AND manages form state is two hooks.
- Hooks must be called unconditionally at the top level of a component or another hook. No conditional hook calls.

### 2.5 Naming Conventions

| Concept | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `ProgramCard`, `WorkoutLog` |
| Hooks | camelCase, `use` prefix | `usePrograms`, `useWorkoutLog` |
| Functions | camelCase | `calculateVolume`, `formatDuration` |
| Variables | camelCase | `activeWorkout`, `athleteCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_SET_COUNT`, `DEFAULT_PAGE_SIZE` |
| Types / Interfaces | PascalCase | `Program`, `WorkoutLogState` |
| Files (components) | PascalCase | `ProgramCard.tsx` |
| Files (utilities) | kebab-case | `format-duration.ts` |
| Files (hooks) | camelCase, `use` prefix | `usePrograms.ts` |
| Files (types) | kebab-case | `program-types.ts` |
| Directories | kebab-case | `program-builder/`, `athlete-profile/` |
| CSS classes | kebab-case (Tailwind handles via utility classes) | |
| Database columns | snake_case | `created_at`, `athlete_id` |
| API endpoints | kebab-case | `/workout-programs`, `/nutrition-plans` |
| API fields | snake_case | `scheduled_date`, `athlete_id` |

### 2.6 Error Handling

- API calls always handle errors through TanStack Query's `onError` callbacks, not try/catch in components.
- Error boundaries wrap feature sections, not individual components (too granular).
- Never silently swallow errors. If an error is intentionally ignored, add a comment explaining why.
- Error messages for users: "We couldn't save your program. Check your connection and try again."
- Error messages for developers: include request ID, endpoint, status code, and relevant context.

---

## 3. Go

### 3.1 Style

- Follow [Effective Go](https://go.dev/doc/effective_go) and the [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments).
- All code is formatted with `gofmt`/`goimports`. No deviations.
- All code passes `golangci-lint` with the project's `.golangci.yml` configuration.
- Maximum line length: 120 characters. No hard enforcement, but be reasonable.

### 3.2 Naming Conventions

| Concept | Convention | Example |
|---------|-----------|---------|
| Packages | lowercase, single word | `training`, `athlete`, `nutrition` |
| Files | snake_case | `workout.go`, `program_repository.go` |
| Exported types | PascalCase | `Workout`, `ProgramRepository` |
| Unexported types | camelCase | `setLogger`, `eventBus` |
| Exported functions | PascalCase | `NewWorkout`, `Complete` |
| Unexported functions | camelCase | `validateRPE`, `calculateLoad` |
| Variables | camelCase | `athleteID`, `workoutCount` |
| Constants (exported) | PascalCase | `MaxSetsPerExercise = 20` |
| Constants (unexported) | camelCase | `defaultPageSize = 20` |
| Acronyms | All caps or all lower (consistent within context) | `HTTPHandler`, `userID`, `HTTPServer` |
| Interfaces | Single-method: `-er` suffix. Multi-method: descriptive noun. | `Reader`, `WorkoutRepository` |
| Errors | `Err` prefix for sentinel errors | `ErrWorkoutAlreadyCompleted` |
| Error variables | `err` prefix in function scope | `err`, `validationErr` |

### 3.3 Package Organization

- One concept per package. A package called `models` or `utils` is a failure of naming — those are junkyard packages.
- Packages are organized by feature, not by layer (see `05-backend-architecture.md §1.3`).
- Exported API is minimal. If a type or function doesn't need to be used by other packages, don't export it.
- `internal/` directory enforces that packages are not importable by external modules.

### 3.4 Error Handling

- Functions return `(T, error)`, never throw/panic for expected error conditions.
- Errors are always checked. Never use `_` to discard an error without a comment explaining why it's safe.
- Error wrapping: use `fmt.Errorf("failed to save workout: %w", err)` to preserve the error chain.
- Sentinel errors: define package-level `var ErrX = errors.New("...")` for expected error conditions that callers need to check with `errors.Is()`.
- Custom error types: implement the `error` interface for errors that carry additional context (status code, field name, validation details).
- Panic is reserved for unrecoverable programmer errors (nil pointer dereference on a required dependency, logic that should be impossible). Never use panic for input validation or business rule violations.
- All errors are logged at the point where they are handled, not at every level they propagate through.

### 3.5 Concurrency

- **Share memory by communicating, not communicate by sharing memory.** Prefer channels over mutexes for coordination.
- Goroutine lifecycle must be explicit: every goroutine you start, you must know when and how it stops. Use `context.Context` for cancellation.
- No unbounded goroutine creation. Worker pools or semaphore patterns for bounded concurrency.
- `sync.WaitGroup` for waiting on a known set of goroutines.
- `sync.Mutex` for protecting shared mutable state when channels are impractical.
- No `time.Sleep` as a synchronization mechanism. Use channels, wait groups, or conditions.
- `context.Context` is the first parameter of every function that performs I/O or long-running work.
- Respect context cancellation: check `ctx.Err()` in loops and return promptly.

### 3.6 Performance

- Avoid allocations in hot paths. Use `sync.Pool` for frequently allocated objects.
- Pre-allocate slices with known capacity: `make([]Workout, 0, expectedSize)`.
- Use `strings.Builder` instead of `+` for string concatenation in loops.
- Use `bytes.Buffer` for constructing byte sequences.
- Benchmark before optimizing. Every optimization must be justified by benchmark data.
- `pprof` for profiling; never guess about performance.

---

## 4. Dart & Flutter

### 4.1 Style

- Follow the [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style).
- All code is formatted with `dart format`. No deviations.
- All code passes `dart analyze` with zero errors and zero warnings.
- Maximum line length: 80 characters (Dart convention). Doc comments: 80 characters.

### 4.2 Naming Conventions

| Concept | Convention | Example |
|---------|-----------|---------|
| Files | snake_case | `workout_log_screen.dart` |
| Classes / Enums / Mixins | PascalCase | `WorkoutLogNotifier` |
| Variables / Functions | camelCase | `completedSets`, `calculateVolume()` |
| Constants | camelCase (Dart convention) | `maxSetsPerExercise` |
| Private members | `_` prefix | `_exerciseIndex`, `_handleComplete()` |
| Packages | snake_case | `training_repository` |
| Imports | package: for internal, dart: for SDK | `package:mr_training/...` |
| Providers | camelCase, `Provider` suffix | `todaysWorkoutsProvider` |

### 4.3 Widget Rules

- **Widget decomposition:** No widget over 200 lines. Extract sub-widgets liberally. A `build` method over 50 lines is a red flag.
- **Const constructors:** Every widget that can be const must be const. This is not optional — it has significant performance implications in Flutter.
- **StatelessWidget by default.** Use StatefulWidget only when the widget itself manages mutable state. Most state should be in Riverpod providers, not in widget state.
- **ConsumerWidget / ConsumerStatefulWidget** for widgets that need Riverpod state. Never use `context.read()` or `context.watch()` in build methods — use the `ref` parameter.
- **No `BuildContext` across async gaps.** After an `await`, do not use the `BuildContext` that was captured before the await — it may be invalid (widget unmounted).
- **Keys:** Use `ValueKey` for widgets in lists that can be reordered. Never use `index` as a key for dynamic lists.
- **Responsive design:** Use `LayoutBuilder` and `MediaQuery` for responsive layouts. No hardcoded dimensions based on a specific device.

### 4.4 State Management with Riverpod

- **Provider naming:** `entityNameProvider` for providers. `todaysWorkoutsProvider`, `selectedAthleteProvider`, `authStateProvider`.
- **Provider types by use case:**
  - Simple value: `StateProvider<T>`
  - Async data fetching: `FutureProvider<T>` or `StreamProvider<T>`
  - Complex mutable state: `StateNotifierProvider<Notifier, State>`
  - Dependency injection: `Provider<T>`
- **Auto-dispose:** Let Riverpod manage provider lifecycle. Do not manually dispose providers.
- **Provider composition:** Providers depend on other providers through `ref.watch()`. Never create a provider that duplicates state from another provider — compose them.
- **Family providers:** Use `provider.family` for parameterized providers (e.g., `workoutProvider(workoutId)`).

### 4.5 Freezed Models

All domain models use `freezed` for immutability and `json_serializable` for JSON:

```dart
@freezed
class Workout with _$Workout {
  const factory Workout({
    required String id,
    required String athleteId,
    @Default([]) List<WorkoutExercise> exercises,
    required String status,
    required DateTime scheduledDate,
    DateTime? completedAt,
    int? rpe,
    String? athleteNotes,
  }) = _Workout;

  factory Workout.fromJson(Map<String, dynamic> json) => _$WorkoutFromJson(json);
}
```

- Use `freezed`'s union types for state machines (loading/data/error states).
- All model fields should be `required` unless truly optional and the absence has semantic meaning.
- `@Default` for fields with sensible defaults instead of making them nullable.

### 4.6 Platform Channels

When accessing native APIs (Health Connect, HealthKit, biometrics):
- Platform channel names: `com.mrtraining.app/<feature>`.
- Method channel calls are wrapped in a repository interface in the domain layer.
- Native code (Kotlin/Swift) is minimal — thin adapters that call OS APIs and return results.
- Platform channel errors are caught and converted to domain exceptions.
- Test platform channels with mock method channels in widget tests.

---

## 5. SQL

### 5.1 Style

- SQL keywords: UPPERCASE (`SELECT`, `FROM`, `WHERE`, `JOIN`, `INSERT`, `UPDATE`, `DELETE`).
- Table and column names: `snake_case`.
- Table names are plural: `athletes`, `workouts`, `nutrition_entries`.
- Join tables: `athlete_coach_assignments` (both table names in alphabetical order).
- Primary key: always `id UUID PRIMARY KEY DEFAULT uuid_generate_v7()`.
- Foreign key: `reference_table_id UUID REFERENCES reference_table(id)`.
- Timestamps: `created_at`, `updated_at`, `deleted_at` — all `TIMESTAMPTZ`.
- Boolean columns: prefix with `is_` or `has_`: `is_active`, `is_completed`, `has_waiver`.
- No Hungarian notation: don't prefix columns with table names (`athlete_name` is wrong; it's `name` in the `athletes` table).
- Indices: `idx_{table}_{column(s)}` for regular indices, `idx_{table}_{column}_unique` for unique indices.
- Constraints are named: `fk_{table}_{ref_table}`, `uq_{table}_{column}`, `ck_{table}_{rule}`.

### 5.2 Migration Rules

- Migrations are versioned: `000001_create_organizations.up.sql`, `000001_create_organizations.down.sql`.
- Every up migration has a corresponding down migration.
- Migrations are idempotent where possible (`CREATE TABLE IF NOT EXISTS`).
- No data migrations in schema migration files. Data migrations are separate scripts with their own versioning.
- All DDL changes are backward-compatible following the expand-contract pattern.
- Migration files are embedded in the Go binary and run via `golang-migrate`.

### 5.3 Query Rules

- Always use parameterized queries. Never concatenate user input into SQL strings.
- Explicit column lists in SELECT: `SELECT id, name, email FROM users` — never `SELECT *`.
- Explicit column lists in INSERT: `INSERT INTO users (id, name, email) VALUES ($1, $2, $3)`.
- Use CTEs for complex queries instead of nested subqueries for readability.
- `LIMIT` and `OFFSET` for pagination. Cursor-based pagination with `WHERE created_at < $cursor ORDER BY created_at DESC` for feeds.
- All queries against soft-deletable tables include `WHERE deleted_at IS NULL` (enforced through views).
- All queries against tenant-scoped tables include `WHERE organization_id = $org_id` (enforced through RLS as defense in depth).

---

## 6. CSS & Tailwind

### 6.1 Tailwind-First Approach

- All styling uses Tailwind utility classes. Custom CSS is written only when Tailwind cannot express the design (complex animations, pseudo-elements, print styles).
- Design tokens from `02-design-system.md` are mapped to Tailwind's `theme.extend` in `tailwind.config.ts`.
- Never use inline styles (`style={{}}`). Use Tailwind classes or CSS modules for dynamic styles.

### 6.2 Class Organization

- Group classes logically: layout → spacing → typography → colors → borders → effects.
- For complex class lists, extract to a variable or use `cn()` (clsx + tailwind-merge).
- Responsive prefixes: `sm:` (640px+), `md:` (768px+), `lg:` (1024px+), `xl:` (1280px+).
- Dark mode: `dark:` prefix (dark mode is default, light is secondary).
- State variants: `hover:`, `focus:`, `active:`, `disabled:`, `group-hover:`.
- Never use `!important` — if you think you need it, the specificity problem is elsewhere.

### 6.3 Component Patterns

- Use `cn()` utility for conditional classes:

```typescript
import { cn } from '@lib/utils/cn';

const className = cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-variant',
  classNameProp // passed from parent
);
```

- Use `cva` (class-variance-authority) for components with multiple variants:

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-text-inverse hover:bg-brand-primary-hover',
        secondary: 'border border-surface-6 text-text-primary hover:bg-surface-4',
        ghost: 'text-text-secondary hover:bg-surface-3',
      },
      size: {
        sm: 'h-8 px-3 text-caption',
        md: 'h-10 px-4 text-body-sm',
        lg: 'h-12 px-6 text-body',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

### 6.4 Custom CSS

When Tailwind is insufficient, custom CSS is written in CSS Modules (`*.module.css`) colocated with the component:
- One CSS Module file per component that needs custom styles.
- Class names are camelCase (automatically scoped by CSS Modules).
- Use CSS custom properties for values that change based on state or theme.
- No global CSS except for reset, font faces, and CSS custom property definitions in `globals.css`.

---

## 7. Git & Version Control

### 7.1 Branch Strategy

```
main              # Production — always deployable
  ├── develop     # Integration — latest development state
  │   ├── feature/xxx-*    # Feature branches
  │   ├── fix/xxx-*        # Bug fix branches
  │   ├── chore/xxx-*      # Chores, refactoring, docs
  │   └── hotfix/xxx-*     # Production hotfixes
  └── release/x.y.z  # Release preparation
```

### 7.2 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:
```
feat(training): add AI workout generation endpoint
fix(payments): handle Stripe webhook idempotency for duplicate events
docs(api): document rate limiting headers for all endpoints
refactor(athlete): extract metrics calculation to domain service
```

Rules:
- Description is imperative mood ("add" not "added", "fix" not "fixed").
- Description is lowercase, no trailing period.
- Maximum 72 characters for the description line.
- Reference issue numbers in the footer: `Closes #123` or `Refs #456`.

### 7.3 Pull Requests

- PR title matches the commit convention (squash merge uses PR title as commit message).
- PR description includes: what changed, why, testing performed, screenshots (if UI changes).
- PR template includes a security review section for changes involving auth, data access, or payments.
- One PR = one logical change. Do not bundle unrelated changes.
- PR author reviews their own PR before requesting review (self-review checklist).
- All CI checks must pass before merging (lint, typecheck, test, build).
- At least one approving review from a teammate is required.
- No force-push to main or develop. Rebase feature branches before merging.

### 7.4 .gitignore

Standard ignores for:
- Dependencies (`node_modules/`, `vendor/`)
- Build artifacts (`.next/`, `build/`, `dist/`)
- Environment files (`.env*` except `.env.example`)
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Logs (`*.log`)
- Coverage reports (`coverage/`)
- Generated code (mark with `.gen.` suffix where regeneration is expected)

---

## 8. Code Review

### 8.1 Review Standards

Every PR must be reviewed against these criteria:

**Correctness**
- Does the code do what it claims to do?
- Are edge cases handled (null, empty, boundary values, error states)?
- Are there off-by-one errors?
- Are race conditions possible in concurrent code?
- Are database queries efficient and properly indexed?

**Security**
- Is all input validated? (Never trust client input)
- Are authorization checks present on every endpoint/function?
- Is sensitive data (tokens, passwords, PII) ever logged or exposed?
- Are SQL queries parameterized? (No string concatenation)
- Is the organization context correctly scoped for all data access?

**Design**
- Does the code follow the project's architecture (Clean Architecture, feature-first)?
- Are dependencies pointing in the right direction (outer → inner layers)?
- Are there circular dependencies?
- Is there unnecessary coupling between features?

**Maintainability**
- Is the code readable without explanation?
- Are names meaningful and self-documenting?
- Are functions small and single-purpose?
- Is there duplicated code that should be extracted?
- Are there commented-out lines or dead code?

**Testing**
- Is new functionality covered by tests?
- Do existing tests still pass?
- Are edge cases and error paths tested?
- Are test names descriptive (state the scenario and expected outcome)?

**Performance**
- Are there N+1 queries?
- Are large datasets paginated?
- Are expensive operations memoized/cached appropriately?
- Is there unnecessary re-rendering or memory allocation?

### 8.2 Review Etiquette

- Reviews are about the code, not the author. Be direct but respectful.
- Ask questions before making assertions: "What happens if `athlete` is null here?" rather than "This will crash if athlete is null."
- Distinguish between blocking issues (must fix) and suggestions (consider this alternative).
- Approve PRs that are good enough — don't block on stylistic preferences that aren't in the coding standards.
- The PR author has final say on suggestions after discussion. The reviewer has final say on blocking issues.
- Review within 24 hours (business days). Urgent PRs can be flagged in Slack.

### 8.3 PR Template

```markdown
## What

Brief description of the change.

## Why

Why is this change needed? Link to issue/feature request.

## How

Overview of the implementation approach. Architecture decisions worth highlighting.

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if UI change)
- [ ] Manual testing performed (describe steps)

## Screenshots

(If UI change — before/after screenshots)

## Security Review

- [ ] All inputs validated
- [ ] Authorization checks present
- [ ] No sensitive data exposed in logs/errors
- [ ] Database queries use parameterized statements
- [ ] Organization context correctly scoped

## Checklist

- [ ] Code follows project conventions
- [ ] No commented-out code or debug logging
- [ ] Self-review completed
- [ ] All CI checks passing
```
