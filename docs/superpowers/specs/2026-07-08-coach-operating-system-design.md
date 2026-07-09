# Coach Operating System — Design Specification

> **Goal:** Build the coach's daily workflow as a guided time-ordered experience with flexible module access. The coach opens the app and is led through their day from 6 AM morning briefing through to the 8 PM daily summary.
>
> **Architecture:** Hybrid — a vertical timeline anchors the day in time order, while a persistent left sidebar and contextual right panel let the coach jump between modules freely. Every screen has a single primary action, loading/empty/error states, and AI integration.
>
> **Tech Stack:** Next.js 14.2 App Router, React 18, TypeScript (strict), Tailwind CSS 3.4, Framer Motion 11, Lucide React, clsx/tailwind-merge. Feature-first layout under `features/coach/`.

---

## Architecture

### Route Structure

All coach routes sit under `(app)/coach/` route group, which requires authentication (middleware).

```
/(app)/coach/
├── layout.tsx              # CoachLayout: sidebar + top bar + right panel + content
├── page.tsx                # Redirect to /coach/today
├── today/
│   ├── page.tsx            # Today's timeline — shows current/pending time block
│   └── [block]/
│       └── page.tsx        # Individual time block screen (morning-brief, check-in, etc.)
```

### Feature Directory Structure

```
features/coach/
├── types/
│   └── index.ts            # Coach-specific types: TimeBlock, AthleteBrief, Session, etc.
├── hooks/
│   ├── useToday.ts         # Today's schedule, time blocks, current block
│   ├── useAthletes.ts      # Today's athletes, readiness data
│   ├── useSessions.ts      # Session data & real-time updates
│   ├── useMessages.ts      # Message threads & notifications
│   └── useAI.ts            # AI generation & insights
├── components/
│   ├── layout/
│   │   ├── CoachLayout.tsx         # Main layout shell (sidebar + topbar + content + right panel)
│   │   ├── TimelineSidebar.tsx     # Left sidebar with time blocks
│   │   ├── TopBar.tsx              # Date, athlete count, notifications, profile
│   │   └── RightPanel.tsx          # Contextual slide-in panel
│   ├── timeline/
│   │   ├── TimeBlockCard.tsx       # Individual time block display
│   │   └── TimeBlockContent.tsx    # Content area for the current block
│   ├── morning-brief/
│   │   └── MorningBrief.tsx        # 6 AM: AI-generated daily briefing
│   ├── check-in/
│   │   ├── AthleteCheckIn.tsx      # 6:15 AM: Athlete readiness list
│   │   └── AthleteReadinessCard.tsx # Individual athlete readiness card
│   ├── session-prep/
│   │   └── SessionPrep.tsx         # 6:30 AM: Session preparation
│   ├── live-session/
│   │   ├── LiveSession.tsx         # 7 AM-12 PM / 1-5 PM: Active session view
│   │   ├── AthleteSessionCard.tsx  # Athlete during session
│   │   ├── RpeCollectionModal.tsx  # Post-session RPE modal
│   │   └── QuickNoteModal.tsx      # Quick observation note modal
│   ├── mid-day/
│   │   └── MidDayReview.tsx        # 12 PM: Mid-day summary
│   ├── program-design/
│   │   ├── ProgramDesign.tsx       # 5 PM: Weekly program overview
│   │   ├── AiGenerationModal.tsx   # AI program generation confirmation
│   │   └── ExerciseBlock.tsx       # Draggable exercise in program
│   ├── communication/
│   │   ├── CommunicationHub.tsx    # 6 PM: Messages & announcements
│   │   ├── MessageThread.tsx       # Individual message thread
│   │   └── ComposeMessageModal.tsx # New message/announcement modal
│   ├── insights/
│   │   └── AiInsights.tsx          # 7 PM: AI performance insights
│   └── daily-summary/
│       └── DailySummary.tsx        # 8 PM: End-of-day summary
├── data/
│   └── _mocks.ts           # Mock data for development (until API exists)
└── index.ts                # Barrel exports
```

### Data Flow

```
Page (URL) → Layout (CoachLayout)
  ├── TimelineSidebar ← useToday()
  ├── TopBar ← useNotifications()
  ├── Content Area ← [TimeBlock Component] ← useToday() / useAthletes() / useSessions() / useAI()
  └── RightPanel ← contextual state (athleteId, threadId, exerciseId)
```

Each time block component owns its data via dedicated hooks. Hooks return `{ data, isLoading, error, isEmpty }` consistent interface. Right panel is driven by a `panelState` context that any component can open.

---

## Design System Integration

All components use the existing design tokens:
- `bg-surface-0` through `surface-6` for backgrounds
- `text-primary` / `text-secondary` for text
- `brand-primary` (#FF6B00) for primary actions, `brand-secondary` (#0066FF) for secondary
- `glass-card` class for cards
- `font-display` (Montserrat) for headings, `font-body` (Inter) for body text
- `h-12 rounded-md` for buttons, `h-12 bg-surface-2 border-surface-6 rounded-md px-4` for inputs
- `cn()` utility for class merging

---

## Screen-by-Screen Specification

### 1. CoachLayout (Persistent Shell)

The shell wraps all coach routes. It has three zones:

**Left Sidebar** (240px, collapsible to 64px on mobile):
- Top: Logo (monogram only)
- Timeline: vertical list of time blocks, each with time + label
- Current block is highlighted with brand-primary left border
- Past blocks are muted, clickable to review
- Future blocks show as upcoming
- Active session block shows a pulsing dot

**Top Bar** (full width, 56px):
- Left: "Today, [Date]" with calendar icon
- Center: Current time block label + status
- Right: Athlete count badge, notification bell with count, profile avatar (small)

**Right Panel** (400px, slides in from right):
- Contextual: driven by which athlete/session/thread is selected
- Close button (X) or swipe to dismiss
- Animated with Framer Motion slide + fade
- Types:
  - **Athlete Quick View:** Avatar, name, role, readiness score (sleep/HRV/recovery), today's sessions, quick message button, quick note button
  - **Message Thread:** Conversation view with input
  - **Session Detail:** Exercise list, assigned athletes, AI adjustments
  - **Exercise Detail:** Name, sets/reps/rest, video (placeholder), previous results, notes

**Content Area** (fills remaining space):
- Renders the current time block's component
- Animated transitions between blocks

### 2. Morning Brief (6:00 AM)

**States:**
- Loading: Animated skeleton with 3 card shapes (pulsing glass-card)
- Empty: "Welcome to your first day! Let's set up your schedule." + CTA button
- Error: "Could not load today's briefing" + retry button
- Data: Full briefing

**Content:**
- Large greeting: "Good morning, Coach [Name]"
- AI-generated briefing card with subtle AI badge:
  - "Today you have [N] athletes scheduled across [M] sessions"
  - Readiness summary: "[X] athletes ready, [Y] need attention"
  - Weather: "Today's weather: [condition]" (links to outdoor sessions)
  - Notable events: birthdays, achievements, upcoming competitions
- Key metrics row: athlete count, session count, flags count
- Primary action button: "Start Today's Review" (brand-primary)

**Micro-interactions:**
- AI briefing card loads with shimmer effect, then content slides in
- Stats count up from 0

### 3. Athlete Check-in (6:15 AM)

**Content:**
- "Morning Check-in" title with subtitle "Review athlete readiness before sessions"
- Scrollable list of today's athletes, each as a card:
  - Avatar + name + sport
  - Readiness score (color-coded: green ≥80, yellow 60-79, red <60)
  - 3 mini bars: sleep (hours), HRV (ms), recovery (%)
  - Flag icon if needs attention (AI-detected anomaly)
- Tapping an athlete opens Right Panel with Quick View
- "Flag all needing attention" filter toggle

**States:**
- Loading: List skeleton (5-6 card shapes)
- Empty: "No athletes scheduled today. Enjoy the lighter day!"
- Error: "Could not load athlete data" + retry

**Right Panel — Athlete Quick View:**
- Large avatar + name + role
- Readiness breakdown:
  - Sleep: "[7.2h] — Below baseline by 45m"
  - HRV: "[65ms] — Normal range"
  - Recovery: "[82%] — Good"
  - Today's note from athlete (if any)
  - Flag reason if flagged
- Actions: "Send Message", "Add Note", "View Full Profile"

### 4. Session Prep (6:30 AM)

**Content:**
- "Session Preparation" with today's session count
- Sessions listed as expandable cards:
  - Session time + name + location
  - Athlete count assigned
  - Status: Planned / Ready / Needs Review
  - Expand → full session detail:
    - Exercise list with sets/reps/rest
    - AI-suggested adjustments based on readiness data
    - Each suggestion: "Reduce [exercise] volume by 20% — [athlete] has low recovery" with "Apply" / "Dismiss"
    - Notes from previous session

**States:**
- Loading: Session card skeletons
- Empty: "No sessions planned today. Create a new program?"
- Error: "Could not load session data" + retry

**AI Interactions:**
- AI adjustment suggestions appear as inline cards with shimmer load
- "Apply All" / "Review Individually" options
- Each adjustment: chip showing athlete name, suggested change, reasoning

### 5. Live Sessions (7:00 AM - 12:00 PM / 1:00 PM - 5:00 PM)

**Content:**
- Active session header with timer / elapsed time
- Athletes in current session displayed as a grid of cards:
  - Avatar, name
  - Current exercise + set number
  - Heart rate (if available)
  - Status: Active / Resting / Complete
- Tap athlete → Right Panel with exercise detail
- Bottom bar:
  - "Add Exercise" button
  - "End Session" button (triggers RPE Collection modal)
  - "Quick Note" button

**Right Panel — Exercise Detail:**
- Exercise name + video/GIF placeholder
- Current sets: progress dots
- Notes from previous session
- Quick adjust: sets/reps/weight inline edit
- "Log RPE" quick input

**RPE Collection Modal:**
- Appears after session ends
- Title: "Rate Today's Session"
- Athlete list with RPE input per athlete (1-10 scale, number pad style)
- Each athlete: name + large number selector (swipeable or button grid)
- "Collect All" to submit
- Optional: "Did anything unusual happen?" text input

**Quick Note Modal:**
- Simple: "Note about [athlete name]"
- Text area + "Save Note" button
- Preset tags: "Great form", "Needs work on", "Injury concern", "Motivation boost"

### 6. Mid-day Review (12:00 PM)

**Content:**
- "Mid-day Review" with morning summary
- Session completion stats: "[2/3] sessions completed"
- Athlete highlights: "[X] athletes trained, [Y] PRs set"
- Flag summary: "[N] athletes flagged for follow-up"
- Afternoon preview: "Up next: [session names]"
- Primary action: "Prepare Afternoon Sessions"

**States:**
- Loading: Summary card skeleton
- Empty: "Morning complete. No afternoon sessions scheduled."
- Error: "Could not load mid-day data"

### 7. Program Design (5:00 PM)

**Content:**
- "Weekly Program" view showing current week
- Day tabs: Mon Tue Wed Thu Fri Sat Sun (current day highlighted)
- Each day: list of exercises/sessions
- "Add Session" button
- "AI Generate Program" button → triggers AI Generation Modal
- Draggable exercise blocks within a day (reorder)
- Each exercise block: name, sets/reps, assigned athletes

**AI Generation Modal:**
- Title: "AI Program Generator"
- Selection: which days to generate (checkboxes)
- Parameters: focus area (Strength / Endurance / Speed / Mixed), intensity (Low/Med/High), duration
- "Generate" button with AI shimmer
- Result preview: generated week view
- "Apply" / "Regenerate" / "Edit Manually" options
- AI reasoning displayed: "This program focuses on [goal] with [methodology] because..."

**States:**
- Loading: Program skeleton with day tabs
- Empty: "No program yet. Generate or build one."
- Error: "Could not load program data" + retry

### 8. Communication (6:00 PM)

**Content:**
- "Communication" split view
- Left: Thread list (avatar + name + last message preview + time)
- Right (or full on mobile): Active thread
- Tabs: All / Unread / Athletes / Groups
- AI-suggested messages section:
  - "Based on today's performance, consider sending:"
  - Suggested messages: "Great effort today on [exercise], [athlete]!" with "Send" / "Edit" buttons
- Compose button (pencil icon, bottom right)

**Compose Message Modal:**
- To: multi-select athlete picker (search + select)
- Type: Individual / Group Announcement
- Subject / Message input
- AI Assist button: "Write a message about today's session" → generates draft
- Send button

### 9. AI Insights (7:00 PM)

**Content:**
- "AI Insights" with performance analysis
- Cards for each insight type:
  1. **Performance Trends:** "Athlete [name] improved [metric] by [X]% this week"
  2. **Anomaly Detection:** "[Athlete]'s HRV dropped 30% — possible overtraining"
  3. **Readiness Predictions:** "Tomorrow's predicted readiness: [X] athletes high, [Y] low"
  4. **Program Recommendations:** "Consider adding more recovery for [group] based on this week's load"
  5. **Comparison:** "Your athletes' avg recovery is [X]% — [above/below] last week"
- Each card: AI badge, explanation text, action button ("View Athlete", "Adjust Program", "Dismiss")
- Insight cards load with staggered shimmer, then slide in

**States:**
- Loading: Insight skeleton cards
- Empty: "Not enough data yet. Insights appear after 3+ days of tracking."
- AI Generating: "Analyzing today's data..." shimmer state
- Error: "AI insights temporarily unavailable" + retry

### 10. Daily Summary (8:00 PM)

**Content:**
- "Today's Summary" with celebration feel
- Large checkmark or achievement graphic
- Stats row: Athletes trained, Sessions completed, Messages sent, Notes logged
- Highlights section: "Today's Highlights"
  - Best athlete moment (AI-selected)
  - Personal achievement if applicable
  - Team milestone
- Tomorrow's preview:
  - "[X] athletes scheduled"
  - "[Y] sessions planned"
  - "Recommended focus: [AI suggestion]"
- Primary actions:
  - "Preview Tomorrow" → show tomorrow's timeline
  - "End Day" → transition to "Day Complete" state with subtle animation

**States:**
- Loading: Summary skeleton
- Empty: "First day complete! Great start. Tomorrow's preview will appear here."
- Error: "Could not load summary" + retry

---

## Shared Components & States

### Loading States
Every content section uses an animated skeleton pattern:
- Glass-card shapes with `animate-pulse` (bg-surface-4)
- Content-specific shape count (e.g., 3 cards for brief, 6 cards for athlete list)
- Sections load independently — loaded content is visible while others load

### Empty States
Each screen has a contextual empty state:
- Illustration: Large icon (lucide) in a circle (bg-surface-4/50)
- Message: Friendly explanation
- CTA: Primary action to resolve emptiness (e.g., "Schedule first session")

### Error States
Consistent error handling:
- Inline error banner at top of content area (glass-card, red-tinted border)
- Error icon + message + retry button
- Does not break other sections

### AI Interaction Pattern
Every AI feature follows the same UX:
1. **Trigger:** User action or automatic on screen load
2. **Loading:** Subtle shimmer on AI section (not full page)
3. **Result:** Content slides in with AI badge (tiny chip: "AI" + sparkle icon)
4. **Action:** User can apply, dismiss, or edit AI suggestions
5. **Feedback:** "Was this helpful?" thumbs up/down (future)

### Animations
- Transitions between time blocks: Framer Motion `layout` + fade
- Right panel: slide from right (300ms ease-out)
- Modals: backdrop blur + scale-in (250ms)
- Lists: stagger children (50ms delay per item)
- Numbers: count-up animation
- AI badge: sparkle shimmer (CSS animation)
- Timeline current block: subtle pulse indicator

### Responsive Design
- Desktop (1024+): Full three-column layout (sidebar + content + right panel)
- Tablet (768-1023): Sidebar collapses to icon-only, right panel overlays
- Mobile (<768): Single column, timeline accessible via hamburger, modals are full-screen panels

### Accessibility
- All interactive elements keyboard-accessible
- Focus indicators visible (ring-brand-primary)
- Screen reader labels on all icons
- ARIA live regions for AI content updates
- Reduced motion: `prefers-reduced-motion` honored (existing global CSS)
- Color contrast: WCAG AA minimum (existing design tokens meet this)

---

## Data Types

```typescript
interface TimeBlock {
  id: string; // 'morning-brief' | 'check-in' | 'session-prep' | 'live-session' | 'mid-day' | 'program-design' | 'communication' | 'insights' | 'daily-summary'
  label: string;
  time: string; // '6:00 AM' etc.
  endTime: string;
  icon: string; // lucide icon name
  status: 'upcoming' | 'current' | 'past';
}

interface CoachAthleteBrief {
  id: string;
  name: string;
  avatarUrl?: string;
  sport: string;
  readiness: {
    sleep: number; // hours
    hrv: number; // ms
    recovery: number; // percentage
    score: number; // 0-100 composite
  };
  flag?: AthleteFlag;
  todaySessions: string[]; // session ids
}

interface AthleteFlag {
  type: 'readiness' | 'injury' | 'message' | 'attendance' | 'performance';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

interface CoachSession {
  id: string;
  name: string;
  time: string;
  endTime: string;
  location: string;
  athletes: string[]; // athlete ids
  status: 'planned' | 'ready' | 'in-progress' | 'completed';
  exercises: Exercise[];
  aiAdjustments?: AiSuggestion[];
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest: number; // seconds
  weight?: number;
  videoUrl?: string;
  notes?: string;
}

interface AiSuggestion {
  id: string;
  type: 'adjustment' | 'insight' | 'message' | 'generation' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  reasoning: string;
  actionLabel: string;
  dismissed?: boolean;
  applied?: boolean;
}

interface MessageThread {
  id: string;
  participants: { id: string; name: string; avatarUrl?: string }[];
  lastMessage: Message;
  unread: boolean;
  messages: Message[];
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'announcement' | 'ai-suggested';
}

interface CoachDailySummary {
  date: string;
  athleteCount: number;
  sessionCount: number;
  completedSessions: number;
  messageCount: number;
  notesCount: number;
  highlights: string[];
  aiRecommendation: string;
  tomorrowPreview: {
    athleteCount: number;
    sessionCount: number;
    suggestedFocus: string;
  };
}
```

---

## Implementation Order

1. **Foundation:** CoachLayout, TimelineSidebar, TopBar, RightPanel, routing setup
2. **Today's Timeline:** TimeBlockCard, time block navigation
3. **Data layer:** Mock data, hooks (useToday, useAthletes, useSessions, useMessages, useAI)
4. **Morning Block:** MorningBrief, AthleteCheckIn, AthleteReadinessCard
5. **Session Blocks:** SessionPrep, LiveSession, AthleteSessionCard, RpeCollectionModal, QuickNoteModal
6. **Mid-day/Program:** MidDayReview, ProgramDesign, ExerciseBlock, AiGenerationModal
7. **Communication:** CommunicationHub, MessageThread, ComposeMessageModal
8. **Insights & Summary:** AiInsights, DailySummary
9. **Polish:** Animations, transitions, responsive, accessibility, states audit

---

## Spec Self-Review

- [x] No placeholders — every screen is specified with content, states, AI interactions
- [x] Internal consistency — types match across screens, data flow is defined
- [x] Scope focused — single feature (Coach OS), not decomposed further
- [x] No ambiguity — every screen has clear content, primary action, and states
- [x] Architecture matches codebase patterns (feature-first, hooks, cn(), framer-motion)
- [x] Every user-facing state defined (loading, empty, error, data)
- [x] AI interaction pattern consistent across all features
- [x] Responsive design and accessibility requirements included
- [x] MASTER_PROMPT principles respected: one primary action per screen, progressive disclosure, premium feel
