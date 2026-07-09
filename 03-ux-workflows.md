# MR Training UX Workflows

**Version 1.0 — 2026**

---

## Table of Contents

1. [UX Principles](#1-ux-principles)
2. [Onboarding Flow](#2-onboarding-flow)
3. [Coach Workflows](#3-coach-workflows)
4. [Athlete Workflows](#4-athlete-workflows)
5. [Academy/Org Admin Workflows](#5-academyorg-admin-workflows)
6. [AI-Assisted Workflows](#6-ai-assisted-workflows)
7. [Mobile-First Workflows](#7-mobile-first-workflows)
8. [Error & Empty States](#8-error--empty-states)
9. [Micro-Interactions](#9-micro-interactions)
10. [Accessibility Workflows](#10-accessibility-workflows)

---

## 1. UX Principles

These ten principles govern every screen, every interaction, and every workflow in MR Training. They are not guidelines. They are constraints. Violate them and you violate the user's trust.

### Principle 1: One Primary Action Per Screen

Every screen answers exactly one question: "What should I do now?" The answer is a single, unambiguous call to action rendered in Electric Orange (`#FF6B00`) — the only element on the screen that uses the brand's dominant accent. On the athlete's dashboard, the button reads "Start Today's Workout." On the coach's program builder, it reads "Publish Program." On the academy admin's revenue page, it reads "Export Report."

A screen with two primary actions has zero. When a view appears to demand multiple equally important actions — review a session and assign the next one, or accept a payment and send a receipt — the workflow is split into sequential steps, not crammed into a single screen. The user completes one focused action, then the next presents itself. This constraint forces clarity. It forces designers to prioritize. It eliminates the paralysis of "what do I click first?"

Collapse secondary and tertiary actions into a single overflow menu (the "..." icon, `--color-text-secondary`). Actions that are destructive (delete, remove, cancel subscription) live in a separate danger zone at the bottom of the view, visually isolated by a 1px `--color-surface-6` divider and a `--space-7` gap. The user should never accidentally destroy data because a delete button was too close to a save button.

### Principle 2: Progressive Disclosure

Show only what the user needs right now. Hide everything else until it becomes relevant. This is not minimalism for aesthetics — it is respect for cognitive capacity. Every visible element demands attention. Every hidden element preserves focus.

Progressive disclosure manifests in three patterns:

- **Step-by-step wizards** for complex creation flows (onboarding, program setup, event creation). A 4-step stepper with completed/active/future states communicates progress without overwhelming. The user sees exactly one step's worth of form fields at a time. "Continue" validates and advances; "Back" preserves state without regression.
- **Expandable sections** for detail views. An athlete profile shows summary cards by default — training load, recovery score, nutrition adherence. Tapping a card expands it inline to reveal the full chart and history. This preserves spatial context; the user never leaves the profile to see details.
- **Contextual toolbars** that appear only when an item is selected. Select an athlete in the roster, and a floating action bar slides up from the bottom: "Assign Program," "Send Message," "View Report." Deselect, and the bar disappears. The interface adapts to the user's focus, not the other way around.

### Principle 3: Reduce Clicks, Not Options

The goal is not to minimize the number of buttons on a screen — it is to minimize the number of decisions required to accomplish a task. A screen with three clearly labeled buttons is faster to navigate than a screen with one button that opens a dropdown with five cryptic options.

Every action label uses verb-first language: "Start Workout," "Save Program," "Assign Athlete." The user reads the verb, knows what will happen, and clicks. If a label requires the user to read it twice, it has failed. Buttons never say "Submit" or "OK" — those words describe keystrokes, not outcomes.

Keyboard shortcuts accelerate power users without cluttering the interface for novices. Global search (Cmd+K / Ctrl+K) opens a command palette with fuzzy matching across athletes, programs, workouts, events, and settings. Typing "alex bench" should surface Alex Kim's bench press history before the user finishes typing. The command palette is the escape hatch for every deep navigation path — if a feature is buried three menus deep, the command palette gets the user there in one query.

### Principle 4: Guide, Don't Force

MR Training never traps the user. Tooltips suggest. Empty states invite. Coach marks educate without blocking. The platform does not use forced tutorials, modal overlays that demand dismissal, or sequential walkthroughs that cannot be skipped. Every guided element has a visible close button that permanently dismisses it — and that decision is respected on subsequent visits.

When a new feature launches, a single, dismissible banner appears at the top of the relevant view: "New: AI Workout Generator. Describe your session and let the system build it." The banner uses a subtle `--color-brand-primary` left-border accent and does not push content down — it overlays the top of the scrollable area and disappears on scroll. The user can engage on their terms.

When a coach has not assigned a program to a new athlete for 24 hours, a contextual nudge appears in the athlete roster: a soft amber dot next to the athlete's name and a card on the coach's dashboard: "Alex Kim has been waiting for a program. Build one now." The nudge is informative, not nagging. It disappears the moment the coach starts the program builder.

### Principle 5: Celebrate Progress

Every milestone deserves acknowledgment. MR Training celebrates three categories of progress:

- **Micro-milestones**: Workout completed, meal logged, recovery score improved. These trigger a brief toast notification with a check icon in Success Green (`#00C853`) and a single-line message: "Session complete. Bench press +5 lb from last week." The toast auto-dismisses in 4 seconds.
- **Achievement milestones**: Personal record set, 30-day streak reached, program phase completed. These trigger a full-screen celebration — the MR monogram pulses with a spring animation (`--ease-spring`, 800ms), confetti particles scatter from the center, and a headline appears: "New PR: 225 lb Bench Press." A single CTA invites sharing to the community feed. The celebration never blocks the user from continuing; tapping anywhere dismisses it.
- **Relationship milestones**: Athlete's 100th session with a coach, 1-year training anniversary, competition qualification. These trigger a personal message prompt: a pre-composed note from the coach that they can edit and send with one tap. The platform suggests the celebration; the human delivers it.

Celebration is not decoration. Celebrated athletes log 23% more sessions than uncelebrated athletes (internal benchmark). Progress acknowledgment is a retention mechanism, not a feel-good feature.

### Principle 6: Predict Before You Ask

The platform anticipates the user's next action and prepares it before they click. When a coach opens the program builder, the template selector pre-filters to the sport and training phase of the currently selected athlete. When an athlete completes a workout, the post-session survey (RPE, soreness, notes) auto-populates the RPE field with an AI-estimated value based on session intensity — the athlete confirms or adjusts, but never starts from zero. When an admin opens the revenue dashboard, the date range defaults to the current billing cycle, not "all time."

Prediction is not automation. The user always has the final say. The platform reduces the distance between intent and action by removing the administrative steps in between. Every field that can be intelligently defaulted should be. Every decision that can be inferred from context should be. The friction should be in the coaching decision, not in the data entry.

### Principle 7: Respect the Coach's Time

A coach's time is their product. Every second spent navigating, searching, or data-entering is a second stolen from coaching. The platform optimizes ruthlessly for coach speed:

- **The dashboard is a triage tool.** The coach's default view is not a generic metrics grid — it is a prioritized list of athletes who need attention today. Missed sessions, flagged anomalies, expiring programs, pending check-ins. The coach scans, taps, and acts. Top of the list: red flags. Middle: scheduled check-ins. Bottom: everything is fine.
- **Batch operations are the default.** Assigning a program to 30 athletes should require 3 steps, not 30. Select all → assign program → confirm. Communicating with a group should be one broadcast, not thirty individual messages. The platform scales with the coach's roster, not against it.
- **Templates eliminate repetition.** Every program, every meal plan, every recovery protocol is saveable as a parameterized template. The coach builds once, reuses forever, tweaks per athlete. The template system is the engine that lets a solo coach manage 100 athletes without hiring help.

### Principle 8: Mobile Is Not a Downgrade

The mobile experience is not a simplified version of the desktop experience. It is the primary experience for athletes and a first-class experience for coaches. Athletes execute workouts on their phones in the gym, on the track, in the pool. Coaches review sessions on tablets between sets, approve programs from their phones at competitions, respond to athlete messages from anywhere.

Every feature available on desktop must be available on mobile. Every mobile interaction must be optimized for one-hand operation: primary actions in the thumb zone (bottom half of the screen), gesture-driven navigation (swipe to go back, pull to refresh, long-press for context menus), and haptic feedback for confirmations (a subtle vibration on workout completion). The mobile app is not the companion — it is the product.

### Principle 9: Data Is Contextual, Not Decorative

A number without context is noise. Every metric displayed in MR Training includes three layers of context: the current value, the trend (directional arrow + percentage change + comparison period), and a threshold indicator (is this value good, warning-level, or critical?). The metric card design system (see Design System §5.1) enforces this structure at the component level — a developer cannot render a number without also rendering its context.

Dashboards are opinionated. The platform decides which metrics matter and surfaces them prominently. The user does not configure their dashboard from a blank grid. They select from curated views: "Performance Overview," "Revenue Summary," "Athlete Engagement." Within each view, the metrics are fixed at positions determined by information hierarchy — the most actionable data is top-left, the most contextual data is bottom-right. Power users can create custom report views, but the default is always a curated experience.

### Principle 10: Offline Is a First-Class State

Athletes train in gyms with spotty reception, on trails without cell service, in pools where phones don't go. The platform must function without connectivity and reconcile gracefully when connectivity returns. Every write operation is queued locally and synced in the background. The athlete completes a workout, rates their RPE, logs their nutrition — the phone stores the data in a local-first architecture (IndexedDB on web, SQLite on mobile) and syncs to the server when the connection is restored.

The offline indicator is subtle: a thin Electric Orange bar at the top of the viewport that reads "Offline — 3 changes pending sync." It does not block interaction. It does not pop a modal. It informs and gets out of the way. Conflict resolution is optimistic: the last write wins for most data types (RPE, nutrition logs, notes), manual merge required for program changes from multiple sources. The platform never loses data because of a dropped connection.

---

## 2. Onboarding Flow

Onboarding is the highest-stakes workflow in the product. A user who abandons onboarding never returns. Every screen must reduce friction, build confidence, and accelerate the user toward their first "aha" moment — the point where they see the value of the platform and commit.

### 2.1 Landing → Authentication

The landing page is not a marketing page. It is the first screen of the product. A hero image of an athlete mid-action (dramatic side lighting, shallow depth of field, warm tones) occupies the left 60% of the viewport on desktop; full-bleed on mobile. The right 40% contains a single-column form with exactly three elements:

```
TRAINING
─────────
The operating system for sports performance.

[Continue with Google]
[Continue with Email]

─────────
Already have an account? Sign in.
```

No password field on the initial screen. The password comes later — after the user has committed an email address. Google OAuth eliminates even that friction for Gmail users. The "Continue with Email" path leads to a second screen: email → verify code → set password → done. Each step is a single input field with a single CTA. No multi-field forms during authentication.

The sign-in flow for returning users mirrors this simplicity. Email → password (or OAuth) → dashboard. "Forgot password?" is a link, not a modal, and leads to a one-field recovery screen. Error messages are specific: "No account found with this email. Check for typos or create a new account." Never: "Invalid credentials."

### 2.2 Organization Setup

After authentication, first-time users without an organization are routed to the organization creation wizard. This is a 2-step flow:

**Step 1 — Organization Type**: The user selects their context from four cards, each with an illustration, headline, and description:

| Card | Context |
|---|---|
| "I'm a coach" | Solo coach managing individual athletes. You design programs, track progress, and grow your coaching business. |
| "I'm an athlete" | Training under a coach or independently. You follow programs, log workouts, and track your progress. |
| "I run an academy" | Multi-coach organization. You manage coaches, athletes, facilities, schedules, and revenue. |
| "I manage a club" | Multi-sport organization. You oversee teams, events, memberships, and facilities. |

Selecting a card advances to Step 2. The card selection determines which features are visible and which onboarding path follows. A coach who later expands to an academy can upgrade their account type without losing data.

**Step 2 — Organization Details**: A single-screen form. Organization name, sport(s) served, optional logo upload. Defaults to the user's name if left blank (e.g., "Alex Kim Coaching"). The CTA reads "Create Workspace" and triggers a brief loading animation (the MR monogram spinner, 800ms) while the backend provisions the workspace, default roles, and initial settings.

The user lands on their role-specific dashboard immediately after creation — no tutorial, no walkthrough. The empty state guides them toward their first action.

### 2.3 Role Selection & Coach/Athlete Onboarding Wizard

The onboarding wizard is context-specific based on the role selected in Step 1.

**Coach Onboarding (4 steps)**:

1. **Specialization**: Multi-select chips for sports coached (Gym, Running, Tennis, Swimming, Cycling, CrossFit). Selecting a sport reveals sub-specializations (e.g., Running → Marathon, Trail, Track, Triathlon). The selection determines which exercise libraries, program templates, and default metric cards appear on the dashboard.

2. **Experience & Credentials**: Years coaching, certifications (dropdown with autocomplete from a curated list: NASM, NSCA, USAW, USATF, etc.), custom credentials. This data populates the coach's public profile for athlete discovery.

3. **Pricing Setup** (skipped for Free tier users): Monthly subscription price, included features, athlete capacity. A live preview card shows exactly what athletes will see. Suggested pricing based on sport, experience, and market data: "Coaches in your specialty typically charge $79–$149/month."

4. **First Athlete**: Invite your first athlete by email or generate a shareable link. Skip option available — the coach can explore the platform before inviting. If skipped, the dashboard empty state reads: "Your roster is empty. Invite your first athlete to start coaching."

The wizard uses the stepper component (see Design System §6.5). Completed steps show a green check. The user can go back and revise any step. On the final step, the CTA reads "Start Coaching" and lands the coach on their dashboard.

**Athlete Onboarding (3 steps)**:

1. **Goals & Sport**: "What are you training for?" with card options (Build Muscle, Lose Weight, Run a Marathon, Compete, General Fitness, Recover from Injury). Secondary: sport selection. This determines the default metric cards and the initial program recommendation.

2. **Experience Level**: Beginner, Intermediate, Advanced. Described in concrete terms, not labels: "I can deadlift 1.5x bodyweight and follow structured programming" vs. "I need someone to tell me exactly what to do each session." This calibrates the AI program generator's output complexity.

3. **Connect with Coach**: Enter a coach's invite code, search for a coach by name, or browse featured coaches (if the marketplace is enabled). Skip option: the athlete can train independently and connect a coach later. Coach connection requires the coach's approval — athletes cannot unilaterally join a coach's roster.

The athlete lands on "Today's Workout" — if a coach has already assigned a program, it renders immediately. If not, the screen shows the AI-generated starter program with the option to customize.

---

## 3. Coach Workflows

The coach interface is a command center, not a dashboard. Every screen optimizes for speed, context, and actionability. The sidebar provides persistent navigation; the content area displays one focused view at a time with a single primary action in Electric Orange.

### 3.1 Dashboard — Today's Overview

The coach's dashboard opens to a triage view, not a metrics grid. The layout, top to bottom:

```
┌─────────────────────────────────────────────────────┐
│  Good morning, Alex.                         [Date]  │
│                                                     │
│  ┌─ NEEDS ATTENTION ──────────────────────────────┐ │
│  │  🔴 Sarah M. missed 3 sessions this week       │ │
│  │  🔴 James K. program expires in 2 days         │ │
│  │  🟡 Maria L. RPE avg trending high (8.2/10)    │ │
│  │  🟡 4 athletes haven't logged today            │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ TODAY'S SCHEDULE ─────────────────────────────┐ │
│  │  9:00 AM  Check-in: Sarah M.                   │ │
│  │  11:00 AM Program review: James K. (Week 4)    │ │
│  │  2:00 PM  Nutrition consult: Maria L.          │ │
│  │  5:00 PM  Academy staff meeting                │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ ROSTER OVERVIEW ──────────────────────────────┐ │
│  │  [Athlete cards: photo, name, sport, status,   │ │
│  │   last session, adherence %, quick actions]     │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [+ Quick Action]                    [View All →]   │
└─────────────────────────────────────────────────────┘
```

The "Needs Attention" section is the most important real estate on the screen. It is populated by the AI anomaly detection engine: missed sessions, abnormal RPE trends, expiring subscriptions, overdue check-ins, injury flags. Each item is a card with a severity indicator (red dot for critical, amber dot for warning), the athlete's avatar, a one-line description, and a single action: "Message," "Review Program," "Check In." Tapping the card navigates to the relevant detail view with the athlete pre-selected.

The primary action is a floating "Quick Action" button (FAB, Electric Orange, 56px diameter, `--shadow-lg`). It opens a speed dial with four options: "Assign Program," "Add Athlete," "Send Broadcast," "Log Session." These cover 80% of a coach's daily actions. The FAB is persistent across all coach views and disappears only when a modal or keyboard is active.

### 3.2 Athlete Management

The athlete roster is a searchable, filterable, sortable table on desktop and a scrollable card list on mobile. Each row/card shows:

- Avatar (with status dot: green = active, amber = paused, gray = inactive)
- Name and sport
- Program phase (e.g., "Build Phase — Week 3 of 8")
- Adherence rate (sparkline + percentage)
- Last session date
- Quick actions (message, view profile, assign program)

Selecting an athlete opens their profile in a slide-over panel on desktop (60% width, from the right) or a full-screen view on mobile. The profile is tabbed: Overview, Training, Nutrition, Recovery, Communication, Billing. Each tab is a vertically scrollable view with its own primary action.

The overview tab aggregates the athlete's current state into a single scroll:

```
┌─────────────────────────────────────────┐
│  [Avatar] Alex Kim                       │
│  Marathon Runner • Advanced • Since 2025 │
│                                         │
│  Current Program: Marathon Build Phase   │
│  Week 3 of 12 • 78% adherence           │
│  [View Program]                         │
│                                         │
│  ┌─ THIS WEEK ─────────────────────────┐│
│  │  Mon  Tue  Wed  Thu  Fri  Sat  Sun   ││
│  │   ✓    ✓    ✗    ✓    —    —    —   ││
│  └─────────────────────────────────────┘│
│                                         │
│  Recent Metrics                         │
│  ┌───────┐ ┌───────┐ ┌───────┐        │
│  │ 34.2km │ │ 5:12  │ │ 72%   │        │
│  │ volume │ │ /km   │ │ recov │        │
│  └───────┘ └───────┘ └───────┘        │
│                                         │
│  Latest Message: "How did the long      │
│  run feel? Any knee pain?" — 2h ago     │
│  [Reply]                                │
└─────────────────────────────────────────┘
```

The primary action on the profile overview is contextual. If the athlete has an active program, it's "View Program." If they just completed a session, it's "Review Session." If they've been inactive, it's "Send Check-In." The action adapts to the athlete's state, not the coach's navigation depth.

### 3.3 Program Builder — Drag-Drop Workout Creation

The program builder is the heart of the coach experience. It is a two-panel interface: a periodized calendar on the left (collapsible to a timeline strip on mobile), and the workout canvas on the right.

**Left panel — Periodized Calendar**: A horizontal timeline showing weeks as columns, days as cells. The coach selects a date range (start/end), defines phases (Base, Build, Peak, Taper, Race), and the calendar renders each phase as a colored band. Dragging phase boundaries adjusts dates. Clicking a day selects it for editing in the right panel.

**Right panel — Workout Canvas**: The selected day's workout, built via drag-and-drop from the exercise library sidebar. The exercise library is a searchable, filterable panel that slides in from the right edge (320px). Exercises are organized by category (Compound, Isolation, Plyometric, Bodyweight) and sport. Each exercise card shows the movement name, a thumbnail of the video demonstration, primary muscle groups as small colored tags, and equipment requirements.

The workout canvas itself is a vertical list of exercise blocks:

```
┌──────────────────────────────────────────┐
│  WORKOUT: Tuesday — Strength + Tempo      │
│                                          │
│  ┌─ WARM-UP ────────────────────────────┐│
│  │  Dynamic Stretching    5 min         ││
│  │  Light Jog             10 min        ││
│  │  [ + Add Exercise ]                  ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ MAIN WORK ──────────────────────────┐│
│  │  Back Squat            4×8 @ 75%     ││
│  │  Romanian Deadlift     3×10 @ 70%    ││
│  │  Box Jumps             4×6           ││
│  │  [ + Add Exercise ]                  ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ ACCESSORY ──────────────────────────┐│
│  │  Bulgarian Split Squat 3×12 each     ││
│  │  Calf Raises           4×15          ││
│  │  [ + Add Exercise ]                  ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ COOL DOWN ──────────────────────────┐│
│  │  Static Stretching     10 min        ││
│  │  [ + Add Exercise ]                  ││
│  └──────────────────────────────────────┘│
│                                          │
│  Coach Notes:                            │
│  "Focus on depth in squats. Video your  │
│   last set and send it over."           │
│                                          │
│  [Save Draft]              [Publish →]   │
└──────────────────────────────────────────┘
```

Each exercise block is draggable to reorder. Each set/rep/weight field is an inline-editable input. A block's overflow menu ( ⋮ ) offers: duplicate, replace exercise, add notes, delete. The exercise library search supports natural language: type "leg push" and it returns squat variations, leg press, lunges. Type "explosive upper" and it returns push press, medicine ball throws, plyometric push-ups.

The template system is accessible from the toolbar: "Save as Template" saves the current workout as a reusable block with parameterized intensity (%1RM, RPE ranges), sets, and reps. Applying a template to an athlete auto-calculates weights based on that athlete's performance history and current training maxes.

The primary action is "Publish Program." Publishing pushes the entire training block to all assigned athletes, sends a push notification ("Your new program is ready"), and moves the program to "Active" status. Before publishing, the coach can preview how the program will look on the athlete's mobile view — a device-frame preview that renders the workout exactly as the athlete will see it.

### 3.4 Session Review

When an athlete completes a workout, it appears in the coach's review queue. The session review screen presents the prescribed workout side-by-side with the athlete's logged data:

```
┌──────────────────────────────────────────────────────┐
│  Alex Kim — Tuesday Strength + Tempo                  │
│  Completed: Today, 8:47 AM • Duration: 1h 12m         │
│                                                      │
│  ┌─ PRESCRIBED ────────┐ ┌─ LOGGED ────────────────┐│
│  │ Back Squat           │ │ Back Squat               ││
│  │ 4×8 @ 75% (185 lb)  │ │ Set 1: 8×185 ✓          ││
│  │                      │ │ Set 2: 8×185 ✓          ││
│  │                      │ │ Set 3: 8×185 ✓          ││
│  │                      │ │ Set 4: 7×185 ⚠ (failed) ││
│  │                      │ │ "Last rep grindy.       ││
│  │                      │ │  Form broke down."       ││
│  ├──────────────────────┤ ├─────────────────────────┤│
│  │ Romanian Deadlift    │ │ Romanian Deadlift        ││
│  │ 3×10 @ 70% (155 lb) │ │ All sets completed ✓    ││
│  ├──────────────────────┤ ├─────────────────────────┤│
│  │ Box Jumps            │ │ Box Jumps                ││
│  │ 4×6 @ 30"           │ │ All sets completed ✓    ││
│  └──────────────────────┘ └─────────────────────────┘│
│                                                      │
│  RPE: 8/10    Soreness: 6/10    Energy: 7/10         │
│  Athlete Note: "Squats felt heavy today. Might need  │
│  a deload week."                                     │
│                                                      │
│  ┌─ COACH FEEDBACK ─────────────────────────────────┐│
│  │ [Type your feedback...                      📎 🎥]││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  [Adjust Next Session →]              [Mark Reviewed] │
└──────────────────────────────────────────────────────┘
```

Anomalies (failed sets, unusually high RPE, missed exercises) are highlighted with amber warning indicators. The coach can tap any logged set to see the athlete's note or attached media. The feedback field supports rich text, file attachments, and video recording — a coach can record a 30-second form critique directly in the review interface.

The primary action is "Adjust Next Session." Tapping it opens an inline editor for the next scheduled workout with pre-populated suggestions based on the current session's data: "Alex failed the last set of squats at 185 lb. Consider reducing to 175 lb or increasing rest time." The coach approves or tweaks and publishes — no navigation required.

### 3.5 Athlete Communication

Communication is embedded in context, not siloed in a separate inbox. Every athlete profile, every session review, every program has an inline messaging thread. When a coach opens an athlete's profile, the most recent messages are visible at the bottom of the screen. Tapping the thread expands it to a full chat interface.

The messaging system supports:
- **Rich text** (bold, italic, lists)
- **Media attachments** (photos, videos up to 500MB, PDFs, spreadsheets)
- **Voice notes** (one-tap record, one-tap send, 5-minute maximum)
- **Video messages** (record face-to-camera feedback)
- **Program snippets** (share a specific workout or exercise with a one-tap link)
- **Scheduled messages** ("Send this check-in Monday at 7 AM")

Unread messages are surfaced on the coach dashboard in the "Needs Attention" section. The notification badge in the top bar aggregates across all athletes. Tapping it opens a notification panel (slide-in from right) showing recent messages grouped by athlete, with quick-reply capability — tap a message, type a response, send, all without leaving the panel.

Group messaging is available for team announcements, challenge coordination, and broadcast updates. A "Broadcast" button in the roster view opens a compose panel with athlete selection (multi-select chips), message composition, and scheduling. Broadcast messages appear in athletes' feeds and trigger push notifications.

---

## 4. Athlete Workflows

The athlete interface is execution-focused. The athlete opens the app to do work, not to browse. Every screen is optimized for speed, visibility in harsh gym lighting, and one-hand operation.

### 4.1 Today's Workout — Execution Mode

This is the most-visited screen in the athlete experience. It must load instantly and guide the athlete through their session with zero ambiguity.

```
┌──────────────────────────────────────────┐
│  TUESDAY, MARCH 15                        │
│  Strength + Tempo                        │
│  Estimated: 75 min                        │
│                                          │
│  ┌─ WARM-UP ── 5:00 ───────────────────┐│
│  │  Dynamic Stretching                  ││
│  │  [Start Warm-Up Timer]               ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ BACK SQUAT ── 1 of 3 exercises ────┐│
│  │  4 sets × 8 reps @ 185 lb (75%)     ││
│  │                                      ││
│  │  Set 1  [  8 reps  ]  [185 lb]  ✓   ││
│  │  Set 2  [  8 reps  ]  [185 lb]  ✓   ││
│  │  Set 3  [  8 reps  ]  [185 lb]  →   ││
│  │  Set 4  [  _ reps  ]  [___ lb]      ││
│  │                                      ││
│  │  Rest Timer:  ──── 1:30 ────        ││
│  │  [  + Add Note  ]  [  📷  ]         ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ ROMANIAN DEADLIFT ─────────────────┐│
│  │  3 sets × 10 reps @ 155 lb          ││
│  │  [Not started]                       ││
│  └──────────────────────────────────────┘│
│                                          │
│  [  + Log Unplanned Exercise  ]          │
│  [  Complete Session  ]                  │
└──────────────────────────────────────────┘
```

The screen is vertically scrollable but snaps to the current exercise. Only one exercise is expanded at a time; completed exercises collapse to a summary line with a green check. The rest timer auto-starts when the athlete logs a completed set. It displays as a large, centered countdown that pulses amber at 30 seconds and orange at 10 seconds. The athlete can add or subtract time with +/- buttons without restarting.

Each set is logged with two large tap targets: reps (numeric keypad) and weight (numeric keypad). The fields are pre-filled with the prescribed values — the athlete only taps if they deviate. A quick-complete gesture (swipe right on the set) logs the prescribed reps and weight with one motion.

At the end of the session, the athlete sees a completion screen:
- Total time, total volume, exercises completed
- RPE slider (1–10 with descriptive anchors: "Very easy" to "Max effort")
- Soreness slider (1–10)
- Energy level (1–10)
- Free-form notes field
- Photo upload (progress photo, form check, or post-workout selfie)
- "Complete & Share" button

The primary action is "Complete Session." Tapping it triggers the celebration animation, logs the session, and returns the athlete to the post-workout summary with recovery recommendations for the next 24 hours.

### 4.2 Progress Tracking

The progress view tells the athlete a story: "Here's where you started. Here's where you are. Here's where you're going." It is organized into three sections:

**Body of Work**: A card grid showing total sessions logged, total volume lifted, total distance run/swum/cycled, total hours trained. Each card shows lifetime total + this month + this week. The most prominent card is the metric most relevant to the athlete's primary sport and goal.

**PR Timeline**: A chronological feed of personal records — new 1RMs, fastest times, longest distances, highest volumes. Each PR card shows the achievement date, the metric, the delta from the previous PR, and the workout that produced it. Tap to view the full session.

**Performance Charts**: Interactive line charts for key metrics — strength progression (estimated 1RM by lift), pace progression (by distance), volume trends (weekly/monthly), adherence rate, body composition changes. Each chart supports date range selection (1M, 3M, 6M, 1Y, All) and includes an export option (CSV, PDF).

The primary action on this screen is "Set Goal" — a FAB that opens a goal-setting modal: select metric, set target, set deadline. Active goals appear as progress cards pinned to the top of the progress view. A completed goal triggers the celebration animation and the option to set a new goal.

### 4.3 Nutrition Logging

Nutrition logging follows the 3-tap rule: the athlete should be able to log a meal in three taps or fewer. The logging screen opens to the current day with meal slots: Breakfast, Lunch, Dinner, Snacks (×2).

To log a meal, the athlete:
1. Taps a meal slot
2. Searches for a food item (barcode scan, text search, recent items, or saved meals)
3. Confirms the serving size (pre-populated with the most recent serving)

That's three taps. The barcode scanner is the fastest path: open → scan → confirm. Saved meals ("My Usual Breakfast") log the entire meal in one tap.

The nutrition dashboard shows:
- Calorie progress ring (current / target, colored fill: green = on track, amber = approaching limit, red = exceeded)
- Macro breakdown (protein / carbs / fat in grams and percentages, three horizontal progress bars)
- Meal-by-meal breakdown (expandable cards showing each meal's items and macros)
- Water intake tracker (tap to add 250ml increments)

The primary action is "Log Meal" (FAB, persistent). Secondary action: "View Meal Plan" if a coach or nutritionist has assigned one.

### 4.4 Recovery Status

The recovery screen consolidates data from wearables (Whoop, Garmin, Apple Watch, Oura) and subjective inputs into a single readiness score displayed as a large circular gauge (0–100). The ring fills clockwise with a gradient from Error Red (0–30) to Warning Amber (31–60) to Success Green (61–100). The center of the ring displays the readiness score in Montserrat ExtraBold, 48px, Electric Orange for scores above 70, white otherwise.

Below the gauge, a card grid breaks down the components:
- **Sleep**: Hours, quality, consistency (7-day trend). Source: wearable or manual log.
- **HRV**: Current value, baseline, trend. Source: wearable.
- **Resting HR**: Current value, baseline, trend.
- **Soreness**: Subjective 1–10 (tap to log).
- **Stress**: Subjective 1–10 (tap to log).
- **Mood**: 5-emoji scale (tap to log).

The "Log Recovery" button opens a single-screen form: sleep hours, sleep quality (5-star), soreness (slider), stress (slider), mood (emoji selection), notes. The form auto-populates wearable data when available; the athlete confirms or adjusts. Three taps to complete.

The primary action is "Log Recovery" (FAB). The secondary action is "View Recommendations" — AI-generated recovery suggestions based on the day's training load and recovery score: "Your recovery score is 52. Consider an active recovery day: 20-min walk, foam rolling, contrast shower."

### 4.5 Community Feed

The community feed is an opt-in social layer. Athletes share workout completions, PRs, challenge entries, and photos. Privacy is granular: each post can be shared with "Everyone," "My Team," "My Coach Only," or "Private" (a personal log, visible only to the athlete).

The feed renders as a vertically scrollable list of cards:

```
┌──────────────────────────────────────────┐
│  [Avatar] Sarah M.            2h ago     │
│  Marathon Build Phase                     │
│                                          │
│  "18 miles done. New longest run.        │
│   Averaged 8:12/mi. Legs are toast."     │
│                                          │
│  ┌─ Activity Card ──────────────────────┐│
│  │  18.2 mi  •  2:29:12  •  8:12/mi    ││
│  │  [Elevation chart]                   ││
│  │  [Pace chart]                        ││
│  └──────────────────────────────────────┘│
│                                          │
│  👍 12    💬 5    🔥 3                   │
└──────────────────────────────────────────┘
```

Interactions: tap the heart (👍) to give kudos, tap the comment bubble (💬) to open the comment thread, tap the fire (🔥) to mark as inspiring. Long-press to save, report, or mute the athlete.

The community tab has three sub-tabs: Feed (all), Team (coach's roster only), Challenges (active challenges with leaderboards). A challenge card shows the challenge name, duration, your current standing on the leaderboard, and the leader's progress. Tapping a challenge opens its detail view with full leaderboard, rules, and a "Log Entry" button.

The primary action is "Share" (FAB) — opens a post composer with workout attachment, photo upload, and privacy selector.

---

## 5. Academy/Org Admin Workflows

### 5.1 Multi-Coach Management

The admin's coach management view is a table with columns: Coach Name, Sport(s), Athlete Count, Active Programs, Athlete Adherence (aggregate), Revenue Generated, Status. Each row is expandable to show the coach's full athlete roster. Actions per coach: Assign Athletes (bulk transfer), Set Schedule, View Reports, Message.

The primary action is "Add Coach" — an invite flow identical to athlete invitation. The coach receives an email with a join link that adds them to the academy workspace with pre-configured permissions.

A coach performance dashboard compares coaches across key metrics: athlete retention rate, program adherence, revenue per coach, athlete NPS. This dashboard is visible only to admins — coaches do not see each other's metrics. The intent is operational visibility, not competition.

### 5.2 Facility Scheduling

A multi-view calendar displaying facility bookings across coaches, sports, and time slots. Views: Day, Week (default), Month. Coaches request time slots; admins approve or resolve conflicts. Color coding: green = approved, amber = pending, gray = available, red = conflict. Tapping a slot opens a detail panel with booking info, equipment requirements, and athlete count.

Conflict detection is automatic: two coaches cannot book the same facility for overlapping time slots. The system suggests alternative times based on both coaches' availability.

### 5.3 Revenue Dashboard

An aggregated financial view for academy and club admins. Key metrics: MRR, ARR, revenue by coach, revenue by sport, revenue by program, outstanding invoices, churn rate. Charts: revenue trend (line, 12-month), revenue breakdown (donut, by coach/sport), athlete lifetime value distribution (bar, by cohort).

The primary action is "Export Report" — generates a PDF with all revenue metrics for the selected period, formatted for board presentations and financial reviews. The secondary action is "Manage Billing" — a link to the Stripe-integrated billing portal.

### 5.4 Athlete Enrollment

An admin workflow for managing athlete intake at scale. The enrollment pipeline tracks athletes through stages: Inquiry → Trial Scheduled → Trial Completed → Enrolled → Active. Each stage has a count badge and is clickable to view the athletes in that stage.

New athlete enrollment: a 3-step form — athlete info (name, sport, age group, parent/guardian info for minors), program selection (which coach, which program, which schedule), payment (plan selection, invoicing or immediate payment). The form supports bulk enrollment via CSV upload for team onboarding (e.g., a new youth soccer team with 20 athletes).

The primary action is "Enroll Athlete." The secondary action is "Import CSV" for bulk enrollment.

---

## 6. AI-Assisted Workflows

AI in MR Training is not a chatbot sidebar. It is embedded in the workflows where it reduces friction, generates options, and surfaces insights — always with a human in the loop for approval.

### 6.1 Workout Generation — Describe → Generate → Tweak → Publish

The AI workout generator is accessible from the program builder toolbar: a "Generate with AI" button that opens a natural language prompt panel.

```
┌──────────────────────────────────────────┐
│  Describe the workout you want to create: │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ "4-day upper/lower split for an      ││
│  │  intermediate lifter focusing on      ││
│  │  hypertrophy. Include progressive     ││
│  │  overload scheme. No Olympic lifts."  ││
│  └──────────────────────────────────────┘│
│                                          │
│  Context:                                │
│  • Athlete: Alex Kim                     │
│  • Estimated 1RM Squat: 245 lb           │
│  • Estimated 1RM Bench: 185 lb           │
│  • Equipment: Full commercial gym        │
│  • Injury Flags: Previous shoulder issue │
│  • Training Phase: Hypertrophy           │
│                                          │
│  [Generate Draft]                        │
└──────────────────────────────────────────┘
```

The AI returns a complete workout draft in 3–5 seconds, rendered in the workout canvas with a subtle blue shimmer animation during generation. Every exercise block includes an "AI Suggested" badge. The coach reviews, reorders, adjusts sets/reps/weights, and publishes. The AI never publishes without human approval. The "Tweak" workflow is iterative: the coach can type follow-up prompts like "Add more hamstring volume" or "Replace barbell bench with dumbbell bench" and the AI regenerates only the affected blocks, preserving the coach's manual edits elsewhere.

### 6.2 Nutrition Plan Generation

Similar pattern to workout generation. Prompt: "Create a 2,800-calorie meal plan for a marathon runner in peak week. High carb, moderate protein, low fat. No dairy. 4 meals + 2 snacks." The AI generates a 7-day plan with meal-by-meal breakdown, macro totals per day, and a grocery list. The nutritionist or coach reviews, adjusts, and assigns to the athlete. The athlete sees the plan in their nutrition tab with daily view and check-off tracking.

### 6.3 Recovery Insights

The AI analyzes trends across sleep, HRV, resting HR, training load, and subjective scores to surface insights: "Your HRV has declined 12% over the last 5 days while training load has increased 18%. This pattern preceded your last overtraining episode. Consider reducing volume by 15% for 3 days." Insights appear as dismissible cards on the athlete's recovery screen and as flags on the coach's dashboard.

### 6.4 Performance Reports

AI-generated narrative reports that translate data into plain-language summaries. Triggered manually by the coach ("Generate Monthly Report for Alex Kim") or scheduled automatically (end of each training phase). The report covers: training adherence, performance trends, PRs achieved, nutrition compliance, recovery patterns, areas of improvement, and recommended focus for the next phase. The coach reviews, edits (the text is fully editable), and shares with the athlete via the messaging system. The report renders as a formatted document with charts, metric cards, and narrative text — not a wall of bullet points.

---

## 7. Mobile-First Workflows

### 7.1 Quick Logging — 3 Taps Maximum

The quick-log workflow is for athletes who need to record data between sets, between bites, or between breaths. Three critical flows are optimized:

**Log a Set**: From the workout execution screen, the athlete taps the set's reps field (tap 1), types the number on the numeric keypad or swipes to increment (tap 2), confirms with the check button (tap 3). If reps and weight are on-target, a single swipe-right on the set logs it as prescribed — zero taps.

**Log a Meal**: From the nutrition tab, tap the meal slot (tap 1), tap a recent or saved meal from the list (tap 2), confirm (tap 3). Barcode scanning reduces this to: open scanner → scan → confirm.

**Log Recovery**: From the recovery tab, tap "Log Recovery" (tap 1), adjust the pre-populated sliders (tap 2 — each slider registers as it's touched, no confirm required), tap "Save" (tap 3).

### 7.2 Workout Execution — One-Hand Operation

The workout execution screen is designed for one-thumb operation on a phone held in the other hand while the athlete rests between sets. Critical elements are anchored to the bottom half of the screen: the current exercise's input fields, the rest timer, the "Next Exercise" preview. The top half shows the exercise name, video demonstration thumbnail (tappable to expand), and coach notes.

The rest timer is the most prominent element — a large, centered countdown with a circular progress indicator. It auto-starts when a set is logged. Tapping the timer pauses it; long-pressing resets it. The "+30s" and "-15s" buttons are large touch targets (56px) positioned at thumb level.

Swiping left on any completed exercise reveals the next exercise in the workout. The transition is animated with a slide gesture that follows the thumb's movement — natural, responsive, deterministic.

### 7.3 Notification Center

Notifications are grouped intelligently to prevent alert fatigue:
- **Immediate**: Coach message, program published, session feedback. Delivered instantly with haptic feedback.
- **Scheduled**: "Time for your morning workout," "Log your lunch," "Evening recovery check-in." Delivered at athlete-configured times.
- **Digest**: Daily and weekly summaries of training stats, community activity, and coach announcements. Delivered at 8 PM daily and Sunday evening.
- **System**: Payment confirmations, subscription renewals, calendar invites. Delivered immediately, silent by default.

The notification panel (swipe down from top or tap bell icon) groups notifications by category and athlete. Tapping a notification opens the relevant screen. Long-pressing a notification reveals quick actions: "Reply" for messages, "Log Now" for workout reminders, "Snooze" for scheduled nudges.

---

## 8. Error & Empty States

### 8.1 Graceful Empty States for Every View

Every view that can be empty has a designed empty state. These are not afterthoughts — they are the first experience a new user has with that view. The empty state pattern (see Design System §3.13) is consistent across the entire platform:

- **Icon/Illustration** (64px, `--color-text-tertiary`): Relevant to the content type. A barbell for workouts, an apple for nutrition, a bed for recovery.
- **Headline** (`--text-h3`, `--weight-semibold`): States the situation in neutral language. "No workouts logged yet." Not: "You haven't logged any workouts."
- **Description** (`--text-body`, `--color-text-secondary`, max-width 400px): Explains the value of populating the view. "Log your first session and start tracking your progress over time."
- **Primary CTA**: The action that fills the view. Present in 90% of empty states.

Empty states are vertically and horizontally centered in their container. The container retains its full dimensions — no collapsing to zero height that causes layout shifts.

**Empty state catalog**:

| View | Icon | Headline | Description | CTA |
|---|---|---|---|---|
| Coach Dashboard (no athletes) | Group icon | Your roster is empty | Invite your first athlete to start coaching. They'll receive a link to join your workspace. | Invite Athlete |
| Athlete Dashboard (no program) | Dumbbell icon | No program assigned | Your coach hasn't assigned a program yet. Check back soon or message your coach. | Message Coach |
| Nutrition Log (empty day) | Apple icon | No meals logged today | Log your meals to track calories and macros against your daily targets. | Log Meal |
| Recovery (no data) | Bed icon | No recovery data yet | Log your sleep, soreness, and readiness to get personalized recovery recommendations. | Log Recovery |
| Messages (no conversations) | Chat icon | No messages yet | Send your coach a question or check-in. They'll receive a notification. | New Message |
| Community Feed (no posts) | Users icon | Nothing shared yet | Be the first to share a workout, milestone, or training update with your team. | Share Update |
| Analytics (insufficient data) | Chart icon | Not enough data yet | Continue logging sessions. Trends will appear after 7 days of consistent logging. | — |
| Events (no events) | Calendar icon | No upcoming events | Your coach or academy hasn't scheduled any events yet. Check back later. | — |

### 8.2 Error Recovery Patterns

Errors are classified into three tiers, each with a distinct recovery pattern:

**Tier 1 — Transient Errors** (network timeouts, temporary server issues):
- Visual: Toast notification, `--color-warning`, auto-dismiss after 5 seconds.
- Message: "Connection interrupted. Your changes are saved locally and will sync automatically."
- Recovery: Background retry with exponential backoff. No user action required.

**Tier 2 — Recoverable Errors** (validation failures, permission denials, conflict states):
- Visual: Inline error banner at the top of the relevant view section. Red left-border accent, error icon, message, and action button.
- Message: Specific and actionable. "This program is already assigned to 3 athletes. Select which athletes to update or create a new version."
- Recovery: One-click action button in the error banner resolves the issue or navigates to the resolution flow.

**Tier 3 — Critical Errors** (authentication failures, data corruption, payment failures):
- Visual: Full-screen error state with illustration, headline, description, and primary action. The navigation bar remains accessible.
- Message: Clear and calm. "Your session has expired. Please sign in again to continue."
- Recovery: One-tap action returns the user to a stable state (sign in, retry payment, contact support).

All error messages follow the brand's voice guidelines: state what happened, explain the fix, never blame the user, never display raw error codes or stack traces.

### 8.3 Offline States

The offline experience is designed around a simple heuristic: the app should feel fully functional without connectivity. The only unavailable features are those that inherently require a server: messaging, publishing programs, processing payments.

**Offline indicator**: A thin Electric Orange bar (4px height) at the very top of the viewport with the text "Offline — 3 pending syncs." It appears with a slide-down animation (300ms, `--ease-enter`) and disappears with a slide-up animation when connectivity is restored. It is not interactive and does not block any functionality.

**Offline behavior by feature**:

| Feature | Offline Behavior |
|---|---|
| Workout Execution | Full functionality. Sets, reps, weights, notes, RPE — all saved locally. Synced when online. |
| Nutrition Logging | Full functionality. Barcode scanner works offline (uses cached database). Synced when online. |
| Recovery Logging | Full functionality. Sleep, soreness, mood — all saved locally. Wearable data unavailable offline. |
| Program Viewing | Read-only. Previously viewed programs are cached locally for 30 days. |
| Progress Charts | Read-only. Previously viewed chart data is cached locally. |
| Messaging | Unavailable. "You're offline. Messages will send when you reconnect." |
| Program Builder | Unavailable. "Program builder requires an internet connection." |
| Community Feed | Cached feed (last 48 hours of posts). Interactions (likes, comments) queued for sync. |

Conflict resolution uses last-write-wins for most data types with a merge strategy for concurrent edits to the same entity. When a conflict cannot be automatically resolved, the affected data is flagged with a warning indicator and the user is prompted to review.

---

## 9. Micro-Interactions

Micro-interactions are the atomic units of delight and feedback. They communicate state, acknowledge action, and guide attention — in under 400 milliseconds.

### 9.1 Haptics

Haptic feedback provides physical confirmation for digital actions. The haptic vocabulary is consistent across the platform:

| Interaction | Haptic Pattern | Duration | Context |
|---|---|---|---|
| Primary action tap | Medium impact | ~100ms | Button press, FAB tap, workout complete. A firm, satisfying thud that says "action acknowledged." |
| Secondary action tap | Light impact | ~50ms | Tab switch, toggle flip, checkbox check. A subtle tick that confirms state change without demanding attention. |
| Swipe action | Selection feedback | ~30ms | Swipe-to-complete, swipe-to-delete. A brief pulse at the moment the swipe threshold is crossed. |
| Long-press activation | Heavy impact | ~150ms | Context menu activation, drag handle grab. A weighted thud that says "you've entered a different interaction mode." |
| Error | Error feedback | ~200ms (two pulses) | Validation failure, sync failure. Double-tap pattern — unmistakably negative. |
| Success | Success feedback | ~150ms (rising) | Session saved, payment confirmed, goal achieved. Ascending intensity that mirrors the celebration animation. |
| Pull-to-refresh | Light impact at release | ~50ms | Content refresh. Confirms the gesture was recognized. |

Haptics are disabled when the device is in silent mode. They respect the system accessibility setting for vibration. All haptic patterns degrade gracefully — if the device doesn't support haptics, visual feedback alone carries the interaction.

### 9.2 Pull-to-Refresh

Pull-to-refresh is available on every scrollable list and feed. The gesture triggers a spring animation: as the user pulls down, the MR monogram appears at the top of the list, rotating proportionally to the pull distance. When the pull exceeds the threshold (80px), the monogram begins a continuous rotation. On release, the content refreshes, the monogram completes one full rotation and fades out, and the list bounces back to its original position.

The refresh indicator uses `--color-brand-primary` (Electric Orange). The animation duration is tied to network latency: the spinner persists until the refresh completes (with a 500ms minimum to prevent flicker), then resolves with a success checkmark for 500ms before dismissing. If the refresh fails, the spinner is replaced with an error icon and a toast: "Couldn't refresh. Check your connection."

### 9.3 Swipe Actions

Swipe actions provide rapid access to secondary operations without navigating to a detail screen or opening a context menu. Swipe actions are available on list items, table rows, and feed cards.

**Swipe left** (reveals destructive/secondary actions from the right edge):
- Athlete roster row: "Message" (blue), "Remove" (red, requires confirmation)
- Workout exercise block: "Delete" (red), "Duplicate" (blue)
- Community post: "Report" (amber), "Mute" (gray)

**Swipe right** (reveals primary/affirmative actions from the left edge):
- Workout set: "Complete as Prescribed" (green)
- Athlete roster row: "Check In" (green)
- Pending payment: "Send Reminder" (amber)

The swipe threshold is 40% of the item width. Below the threshold, the item snaps back to its original position. Above the threshold, the action buttons snap fully open. A single action can be configured as "swipe-to-confirm" — swiping past 80% of the item width triggers the action immediately without requiring a second tap (used for "Complete Set" and "Mark Read").

The swipe animation uses `--ease-spring` for the snap-to-open behavior and `--ease-standard` for the snap-back. The action buttons slide in from the edge with a 100ms stagger between them (when two actions are configured). The background of the swiped area fades to `--color-surface-5` to indicate the item is in a transient state.

### 9.4 Long-Press Menus

Long-press (press and hold for 400ms) activates a context menu anchored to the press point. The menu is a compact dropdown with 2–5 actions, using `--shadow-xl` and an 8px border radius. Items are separated by the standard dropdown divider. The menu appears with a scale animation from the press point (`--ease-spring`, 200ms) and dismisses on item selection, tap outside, or scroll.

The long-press threshold is 400ms — short enough to feel responsive, long enough to prevent accidental activation during scrolling. When the threshold is reached, a subtle haptic pulse confirms activation, and the pressed item elevates (scale to 1.02, `--shadow-md`) to provide visual feedback.

Long-press is the primary mechanism for multi-select on mobile. Long-pressing any item in a list enters selection mode: the item is selected, checkboxes appear on all items, and a floating action bar slides up from the bottom with batch operations.

---

## 10. Accessibility Workflows

Accessibility is not a feature. It is a design constraint at the same level of importance as performance, security, and visual design. MR Training targets WCAG 2.1 Level AA compliance across all views and workflows.

### 10.1 Keyboard Navigation Paths

Every interactive element on every screen must be reachable, operable, and understandable via keyboard alone. The tab order follows visual reading order: left to right, top to bottom, with the primary action receiving focus immediately after the last form field in creation flows and after the main content in consumption flows.

**Coach Program Builder keyboard path**:

```
Tab 1:    Sidebar navigation (skip link available)
Tab 2:    Periodized calendar (arrow keys: day navigation, Enter: select day)
Tab 3:    Exercise library search (type to filter, arrow keys: navigate results, Enter: add exercise)
Tab 4:    Workout canvas (arrow keys: navigate exercise blocks, Enter: expand block)
Tab 5:    Set/rep/weight fields within expanded block (Tab: next field, Shift+Tab: previous)
Tab 6:    Coach notes textarea
Tab 7:    "Save Draft" button (secondary)
Tab 8:    "Publish Program" button (primary)
```

**Athlete workout execution keyboard path**:

```
Tab 1:    Current exercise (Enter: expand)
Tab 2:    Reps field (type or arrow keys to increment/decrement)
Tab 3:    Weight field (type or arrow keys to increment/decrement)
Tab 4:    Confirm set button (Enter or Space)
Tab 5:    Rest timer (+30s, -15s, Pause)
Tab 6:    Add note button
Tab 7:    Next exercise preview
Tab 8:    "Complete Session" button
```

Keyboard shortcuts accelerate power users without obscuring functionality from keyboard-only users:

| Shortcut | Action | Context |
|---|---|---|
| Cmd/Ctrl + K | Open command palette | Global |
| Escape | Close modal, dismiss dropdown, blur input | Global |
| Tab | Next focusable element | Global |
| Shift + Tab | Previous focusable element | Global |
| Enter | Activate focused button/link | Global |
| Space | Toggle checkbox, play/pause timer | Global |
| Arrow keys | Navigate within component (tabs, dropdown, calendar, chart) | Contextual |
| Cmd/Ctrl + Enter | Submit form, publish program | Form contexts |
| Cmd/Ctrl + S | Save draft | Program builder, form contexts |
| Cmd/Ctrl + / | Show keyboard shortcuts help | Global |

A keyboard shortcuts reference is accessible via the "?" key or from the help menu in the sidebar. The reference is a modal with categorized shortcuts, searchable by action name.

### 10.2 Screen Reader Flows

Screen reader users navigate via semantic structure, not visual layout. Every page uses ARIA landmarks (see Design System §10.2) and a strict heading hierarchy to enable rapid navigation by region.

**Screen reader announcement order for the athlete's workout execution screen**:

1. Page title: "Today's Workout — Strength + Tempo"
2. Navigation: "Main navigation. 5 items. Dashboard, Training, Nutrition, Recovery, Community."
3. Main content: "Workout overview. Tuesday, March 15. Estimated duration: 75 minutes."
4. Section: "Warm-Up. 1 exercise. Dynamic Stretching, 5 minutes. Button: Start Warm-Up Timer."
5. Section: "Main Work. 3 exercises."
6. Current exercise: "Back Squat. Exercise 1 of 3. 4 sets of 8 reps at 185 pounds. Set 1: 8 reps at 185 pounds, completed. Button: Log Set 2."
7. Interactive controls: "Rest timer: 1 minute 30 seconds. Button: Pause. Button: Add 30 seconds."
8. Remaining exercises (announced as "Romanian Deadlift. Not started." "Box Jumps. Not started.")
9. Footer actions: "Button: Log Unplanned Exercise. Button: Complete Session."

Dynamic content uses `aria-live` regions to announce changes without moving focus:

- **Set completion**: "Set 2 logged. 8 reps at 185 pounds. Rest timer started."
- **Rest timer**: "30 seconds remaining." (announced at 30s and 10s marks)
- **Workout completion**: "Workout complete. 3 of 3 exercises finished. Button: Rate Session."
- **Toast notifications**: Read in full by screen reader: "Success: Session saved. 14 exercises logged. Button: View."

Form errors are announced via `aria-describedby` connecting the error message to the input field. On form submission with errors, focus moves to the first field with an error, and the error message is announced: "Error: Email address is not valid. Check for typos and try again."

### 10.3 Reduced Motion Alternatives

When `prefers-reduced-motion` is active (detected via the CSS media query), all non-essential animations are disabled. The following replacements are applied:

| Standard Animation | Reduced Motion Alternative |
|---|---|
| Page transitions (300ms crossfade) | Instant state change |
| Modal open/close (scale + fade, 300ms) | Instant appear/disappear |
| Staggered list item entrance | All items appear simultaneously |
| Skeleton shimmer (1.5s loop) | Static placeholder shapes |
| Progress bar fill animation | Instant jump to current value |
| Celebration confetti + pulse | Static completion card with checkmark |
| Pull-to-refresh spinner | Static "Pull to refresh" text |
| Rest timer countdown pulse | Static countdown number, no animation |
| Swipe action snap | Instant reveal of action buttons |
| Long-press menu scale | Instant menu appearance |
| Hover transitions (color, shadow) | Instant state change |
| Chart rendering animation | Instant chart display |
| Tab switch crossfade | Instant content swap |
| Toast slide-in | Static toast appearing at top-right |

Essential animations are preserved even with reduced motion: the indefinite progress spinner for loading states (it communicates "something is happening"), the status dot pulse for live indicators (it communicates "this is actively updating"), and the focus ring transition (it communicates "this element is now interactive"). These animations are informational, not decorative.

The MR monogram spinner is replaced with a static text label: "Loading..." in `--text-body`, `--color-text-secondary`, centered in the loading container. The spinner is an aesthetic choice; the text label is the accessible equivalent that communicates the same information without motion.

---

*This document defines the UX workflows for MR Training. Every screen, every interaction, every flow should be evaluated against these patterns. When a workflow deviates from what is documented here, the deviation must be intentional, justified, and documented — never accidental. The user experience is the product. Build it with the same rigor as the backend architecture and the same care as the visual design.*
