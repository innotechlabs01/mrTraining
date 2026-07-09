# MR Training — Authentication Experience Design

**Version 1.0 — 2026**

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Route Structure](#2-route-structure)
3. [Auth Layout](#3-auth-layout)
4. [Splash Screen](#4-splash-screen)
5. [Welcome Screen](#5-welcome-screen)
6. [Sign In Flow](#6-sign-in-flow)
7. [Sign Up Flow](#7-sign-up-flow)
8. [Forgot Password](#8-forgot-password)
9. [Email Verification](#9-email-verification)
10. [Multi-Factor Authentication](#10-multi-factor-authentication)
11. [Role Selection](#11-role-selection)
12. [Profile Setup](#12-profile-setup)
13. [Coach Onboarding](#13-coach-onboarding)
14. [Athlete Onboarding](#14-athlete-onboarding)
15. [Invitation Flows](#15-invitation-flows)
16. [Welcome Dashboard](#16-welcome-dashboard)
17. [States: Loading, Success, Error](#17-states-loading-success-error)
18. [Animations](#18-animations)
19. [Accessibility](#19-accessibility)
20. [File Structure](#20-file-structure)

---

## 1. Design Philosophy

The MR Training authentication experience is not a form — it is a journey. Every screen builds confidence, reduces friction, and accelerates the user toward their first "aha" moment. The auth flow is the first experience a user has with the product, and it sets the bar for quality.

**Guiding principles:**

- **One primary action per screen.** Every auth screen has exactly one CTA rendered in Electric Orange. No multi-field forms. The user answers one question at a time.
- **Progressive disclosure.** Show only what the user needs right now. Email first, password second, never both on the same screen.
- **Social first.** Google OAuth is the default path. Email auth is the fallback. A user who authenticates via Google skips the email verification step entirely.
- **Clerk-powered, custom UI.** All authentication mechanics use Clerk's hooks (`useSignIn`, `useSignUp`, `useUser`). The UI is 100% custom — MR Training branded, animated, and premium.
- **Dark mode native.** Surface-0 background, Electric Orange accents, full brand alignment.
- **No login form.** Never display username + password fields simultaneously. The traditional login form is replaced by a progressive one-field-at-a-time flow.

---

## 2. Route Structure

All auth routes live in the `(auth)` route group. No sidebar, no marketing nav — a centered branded container on a gradient background.

```
src/app/(auth)/
├── layout.tsx                          # Auth layout (branded shell, Clerk provider)
├── page.tsx                            # Splash screen (root /auth → redirect to splash)
├── welcome/
│   └── page.tsx                        # Welcome: Google OAuth / Continue with Email
├── sign-in/
│   └── page.tsx                        # Email → Password (one field at a time)
├── sign-up/
│   └── page.tsx                        # Email → Password → Confirm (one field at a time)
├── forgot-password/
│   └── page.tsx                        # Email → confirmation
├── verify/
│   └── page.tsx                        # 6-digit code (email verification)
├── mfa/
│   └── page.tsx                        # TOTP / SMS code
├── role-selection/
│   └── page.tsx                        # 4-card role picker
├── setup/
│   └── page.tsx                        # Profile: name, avatar, sport
├── onboarding/
│   ├── coach/
│   │   └── page.tsx                    # 4-step coach wizard
│   └── athlete/
│       └── page.tsx                    # 3-step athlete wizard
├── invite/
│   ├── organization/
│   │   └── page.tsx                    # Accept org invitation
│   ├── coach/
│   │   └── page.tsx                    # Accept coach invitation
│   └── athlete/
│       └── page.tsx                    # Accept athlete invitation
└── welcome-dashboard/
    └── page.tsx                        # Post-onboarding celebration + first CTA
```

---

## 3. Auth Layout

The auth layout wraps every auth page. It provides:
- Full-viewport dark gradient background (surface-0 → surface-2, subtle radial overlay)
- Centered content container (max-w-md on desktop, full-width on mobile)
- MR Training logo (monogram + wordmark) at the top of the card
- Page transition animations via Framer Motion AnimatePresence
- The `ClerkProvider` wrapping the children (so Clerk hooks work in all auth pages)

The layout is a Server Component that renders `AuthShell` (Client Component) as its child. The auth shell handles the animation wrapper and Clerk context.

**States:**
- **Loading:** Skeleton card matching the container dimensions, MR monogram spinner in the center
- **Error:** Error boundary catches rendering errors, shows "Something went wrong" with retry button

---

## 4. Splash Screen

The splash is the first screen a user sees when they land on `/auth`. It is a 3-second brand moment that establishes premium quality before the user engages with the product.

**Visual:**
- Full-viewport, dark background with subtle animated radial gradient pulsing
- MR monogram centered, 120px, Electric Orange
- Monogram animates in: scale from 0.8 → 1.0 with spring easing (800ms)
- Below monogram: "TRAINING" wordmark in Montserrat Bold, uppercase, tracked at +100, White
- Below wordmark: tagline "The operating system for sports performance." in Inter, body-lg, text-tertiary
- Bottom of screen: "Loading..." text fades in after 1s, fades out before transition

**Behavior:**
- 2.5s display duration, then auto-transitions to `/auth/welcome`
- Skip mechanism: tapping anywhere on the screen immediately navigates to welcome
- `prefers-reduced-motion`: no animation, static display, transitions after 1s

**States:**
- **Loading (initial):** MR monogram spinner, 48px, centered, 800ms rotation
- **Success (post-animation):** Splash content fully visible, auto-transitioning
- **Error:** Splash fails to load → redirects directly to `/auth/welcome`

---

## 5. Welcome Screen

The welcome screen is the first interactive auth screen. It offers two paths: social OAuth and email.

**Layout (centered card, max-w-sm):**

```
┌────────────────────────────────────┐
│         [MR logo, 32px]            │
│                                    │
│    Welcome to MR Training          │  H1, Montserrat Bold
│                                    │
│    The operating system for        │  body, text-tertiary
│    sports performance.             │
│                                    │
│    ┌──────────────────────────┐    │
│    │  Continue with Google    │    │  Branded button, Google icon
│    └──────────────────────────┘    │
│                                    │
│    ┌──────────────────────────┐    │
│    │  Continue with Email     │    │  Surface-6 bordered button
│    └──────────────────────────┘    │
│                                    │
│    ──────────────────────────      │  Divider
│                                    │
│    Already have an account?        │  body-sm, text-tertiary
│    [Sign in →]                      │  Brand link
└────────────────────────────────────┘
```

**Behavior:**
- "Continue with Google" → Clerk OAuth flow → success → redirect to `/auth/role-selection` (new user) or dashboard (returning)
- "Continue with Email" → navigate to `/auth/sign-up` (new) or `/auth/sign-in` (returning)
- "Sign in" link → navigate to `/auth/sign-in`

**States:**
- **Loading (OAuth):** Google button shows spinner, other button disabled, brief overlay
- **Success (OAuth):** Redirect to role-selection or dashboard
- **Error (OAuth):** Error banner below the button: "Google sign-in failed. Try again or use email." with retry

---

## 6. Sign In Flow

One field at a time. Never show email and password on the same screen.

### Step 1: Email

```
┌────────────────────────────────────┐
│         [Back arrow]  Sign In      │  Top bar
│                                    │
│    Welcome back                    │  H3
│                                    │
│    Enter your email to continue.   │  body-sm, text-tertiary
│                                    │
│    Email                           │  Label
│    ┌──────────────────────────┐    │
│    │  you@example.com         │    │  Input, focused
│    └──────────────────────────┘    │
│                                    │
│    ┌──────────────────────────┐    │
│    │       Continue           │    │  CTA, Electric Orange
│    └──────────────────────────┘    │
│                                    │
│    Back to [All sign-in options →]  │  Link
└────────────────────────────────────┘
```

**Behavior:**
- Validates email format on blur (regex)
- "Continue" validates and submits to Clerk's `signIn.create({ identifier: email })`
- If email found → proceed to Step 2 (password)
- If email not found → inline error: "No account found with this email. [Sign up instead →]"
- Back arrow returns to `/auth/welcome`

### Step 2: Password

```
┌────────────────────────────────────┐
│         [Back arrow]  Sign In      │
│                                    │
│    you@example.com                 │  body-sm, text-tertiary
│    [Not you? Edit →]               │
│                                    │
│    Enter your password             │  H4
│                                    │
│    Password                        │  Label
│    ┌──────────────────────────┐    │
│    │  •••••••••••••    [👁]   │    │  Input, password toggle
│    └──────────────────────────┘    │
│                                    │
│    [Forgot password?]              │  Right-aligned link
│                                    │
│    ┌──────────────────────────┐    │
│    │       Sign In            │    │  CTA
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Behavior:**
- Password visibility toggle (eye icon)
- "Forgot password?" → navigate to `/auth/forgot-password`
- "Sign In" → Clerk `signIn.attemptFirstFactor({ password })`
- Success → redirect to dashboard (or verify/MFA if required)
- Error → inline: "Incorrect password. [Reset password →]"
- Back arrow returns to Step 1 (email), preserving email value

**States:**
- **Loading:** CTA shows spinner, input disabled
- **Success:** Brief checkmark animation (500ms), then redirect
- **Error:** Red border on input, error message below CTA
- **MFA required:** Auto-redirect to `/auth/mfa`

---

## 7. Sign Up Flow

### Step 1: Email (same visual as Sign In Step 1)

```
┌────────────────────────────────────┐
│         [Back arrow]  Sign Up      │
│                                    │
│    Create your account             │  H3
│                                    │
│    What's your email?              │  body-sm
│                                    │
│    Email                           │
│    ┌──────────────────────────┐    │
│    │  you@example.com         │    │
│    └──────────────────────────┘    │
│                                    │
│    ┌──────────────────────────┐    │
│    │       Continue           │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Behavior:**
- Validate email format
- `signUp.create({ emailAddress: email })`
- If email available → proceed to Step 2
- If email exists → inline: "An account already exists with this email. [Sign in →]"

### Step 2: Verify Code

A 6-digit code is sent to the email. The user enters it digit by digit (6 individual input boxes, auto-advance).

```
┌────────────────────────────────────┐
│    Check your email                │  H3
│                                    │
│    We sent a 6-digit code to       │
│    you@example.com                 │
│                                    │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│    │1 │ │2 │ │3 │ │4 │ │5 │ │6 │ │  6 x 48px inputs
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│                                    │
│    [Resend code — 0:45]            │  Countdown timer
│                                    │
│    ┌──────────────────────────┐    │
│    │       Verify Email       │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Behavior:**
- Auto-submit when all 6 digits entered
- Auto-advance focus on each digit entry
- Paste support (pastes into first field, splits across 6)
- Resend countdown: 60s, auto-resend at 0
- `signUp.attemptEmailAddressVerification({ code })`

### Step 3: Password

```
┌────────────────────────────────────┐
│    Set your password               │  H3
│                                    │
│    Password                        │
│    ┌──────────────────────────┐    │
│    │  •••••••••••••    [👁]   │    │
│    └──────────────────────────┘    │
│    Must be 8+ characters           │  caption, green/amber
│                                    │
│    ┌──────────────────────────┐    │
│    │   Create Account         │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Behavior:**
- Real-time strength indicator (8+ characters, uppercase, number)
- `signUp.update({ password })` then `signUp.commit()`
- Success → redirect to `/auth/role-selection`
- Error → inline specific error

**States for all 3 steps:**
- **Loading:** CTA spinner, input disabled
- **Success:** Checkmark, 500ms delay, redirect
- **Error:** Red border, specific error text, focus on field
- **Validation:** Inline validation on blur, green check on valid

---

## 8. Forgot Password

```
┌────────────────────────────────────┐
│         [Back]  Reset Password     │
│                                    │
│    Forgot your password?           │  H3
│    No problem. Enter your email    │
│    and we'll send you a reset      │
│    link.                           │
│                                    │
│    Email                           │
│    ┌──────────────────────────┐    │
│    │  you@example.com         │    │
│    └──────────────────────────┘    │
│                                    │
│    ┌──────────────────────────┐    │
│    │   Send Reset Link        │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Success state (post-submit):**

```
┌────────────────────────────────────┐
│    ✓                              │  64px, Success Green
│                                    │
│    Check your email                │  H3
│                                    │
│    We've sent a password reset     │
│    link to you@example.com.        │
│    It expires in 1 hour.           │
│                                    │
│    ┌──────────────────────────┐    │
│    │    Back to Sign In       │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

Uses Clerk's `signIn.create({ strategy: "reset_password_email_code" })` or Clerk's forgot password flow. The actual reset happens via the magic link Clerk sends — the app provides the branded intermediary screen.

---

## 9. Email Verification

Used when a user needs to verify a new email address (change email, or initial verification if flow was interrupted).

**Visual:** Same 6-digit code input as Sign Up Step 2, with context-appropriate messaging.

```
┌────────────────────────────────────┐
│    ✉️                              │  64px icon
│                                    │
│    Verify your email               │  H3
│                                    │
│    Enter the 6-digit code sent     │
│    to newemail@example.com.        │  body-sm
│                                    │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│    │  │ │  │ │  │ │  │ │  │ │  │ │
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│                                    │
│    [Resend code — 0:45]            │
│                                    │
│    ┌──────────────────────────┐    │
│    │       Verify             │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**States:**
- **Loading (initial):** Code sent toast, spinner on resend
- **Success:** Green check, "Email verified" redirect
- **Error:** Invalid code: "That code didn't work. Try again or [resend →]"
- **Expired:** "Code expired. [Resend new code →]"
- **Resend:** 60s countdown, resend button disabled during countdown

---

## 10. Multi-Factor Authentication

Triggered when Clerk's session requires MFA (configured org policy or user preference).

**Step 1: Choose method (if multiple configured):**

```
┌────────────────────────────────────┐
│    Two-factor authentication       │  H3
│                                    │
│    Choose a verification method    │  body-sm
│                                    │
│    ┌──────────────────────────┐    │
│    │  🔑 Authenticator app    │    │  Card, selectable
│    └──────────────────────────┘    │
│                                    │
│    ┌──────────────────────────┐    │
│    │  💬 Text message (SMS)   │    │  Card
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Step 2a: Authenticator app — Enter 6-digit code:**

Same 6-digit input component. Label: "Enter the code from your authenticator app."

**Step 2b: SMS — Enter 6-digit code:**

Same 6-digit input component. Label: "Enter the code sent to +1 (555) ***-1234." Phone number masked.

**States:**
- **Loading:** CTA spinner
- **Success:** Brief checkmark, redirect to dashboard
- **Error:** "Incorrect code. Try again." / "Code expired. [Resend →]"
- **Recovery:** "Lost access? [Use recovery code →]" link

---

## 11. Role Selection

Appears after first-time sign-up. The user selects their primary role from 4 cards.

**Visual (2×2 grid on desktop, single column on mobile):**

```
┌────────────────────────────────────┐
│    What brings you to              │  H2
│    MR Training?                    │
│                                    │
│    Choose your role to personalize │  body-sm, text-tertiary
│    your experience.                │
│                                    │
│    ┌────────────┐ ┌────────────┐   │
│    │  🏋️       │ │  🏃       │   │  Cards with icon,
│    │  I'm a     │ │  I'm an   │   │  headline, description
│    │  coach     │ │  athlete  │   │
│    │            │ │           │   │
│    │ Solo coach │ │ Training  │   │
│    │ managing   │ │ under a   │   │
│    │ athletes.  │ │ coach or  │   │
│    │            │ │ alone.    │   │
│    └────────────┘ └────────────┘   │
│                                    │
│    ┌────────────┐ ┌────────────┐   │
│    │  🏛️       │ │  🏟️       │   │
│    │  I run an  │ │  I manage  │   │
│    │  academy   │ │  a club    │   │
│    │            │ │            │   │
│    │ Multi-     │ │ Multi-     │   │
│    │ coach org. │ │ sport org. │   │
│    └────────────┘ └────────────┘   │
└────────────────────────────────────┘
```

**Behavior:**
- Cards are selectable with hover lift effect
- Selection highlights card with Electric Orange border + subtle glow
- Selection immediately navigates to the appropriate flow:
  - Coach → `/auth/onboarding/coach`
  - Athlete → `/auth/onboarding/athlete`
  - Academy → `/auth/onboarding/academy` (or `/auth/setup` for now)
  - Club → `/auth/setup` (placeholder flow)
- Role is stored in Clerk user metadata via `user.update()`

**States:**
- **Loading:** Skeleton cards (4 gray rectangles with shimmer)
- **Success:** Selection highlight animation, navigate
- **Error:** "Couldn't save your selection. Try again." with retry button
- **Empty:** N/A (always 4 cards)

---

## 12. Profile Setup

After role selection (or invitation acceptance). Collects basic profile info.

```
┌────────────────────────────────────┐
│    Set up your profile             │  H2
│                                    │
│    ┌──────────────────────────┐    │
│    │      [Avatar area]       │    │  80px circle, camera overlay
│    │  Upload photo            │    │
│    └──────────────────────────┘    │
│                                    │
│    Full name                       │
│    ┌──────────────────────────┐    │
│    │  Alex Kim                │    │
│    └──────────────────────────┘    │
│                                    │
│    Sport(s)                        │
│    ┌──────────────────────────┐    │
│    │  Running  [×]  Gym [×]   │    │  Multi-select chips
│    └──────────────────────────┘    │
│                                    │
│    ┌──────────────────────────┐    │
│    │    Continue               │    │
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

**Behavior:**
- Avatar upload: opens native file picker, accepts JPG/PNG/WEBP, max 5MB, auto-crops to 1:1
- Name: required, validated non-empty
- Sport(s): multi-select chips from curated list (Gym, Running, Tennis, Swimming, Cycling, CrossFit)
- "Continue" saves to Clerk user metadata and navigates to onboarding or welcome-dashboard

**States:**
- **Loading:** Avatar spinner on upload, CTA spinner on save
- **Success:** Brief checkmark, navigate
- **Error (avatar):** "Upload failed. Try a smaller file." inline below avatar
- **Error (save):** "Couldn't save profile. Try again." banner

---

## 13. Coach Onboarding

4-step wizard for coaches. Uses a stepper component at the top.

### Stepper Component

```
○ → ○ → ○ → ○
Step 1: Specialization
Step 2: Credentials
Step 3: Pricing
Step 4: First Athlete
```

Completed steps: green check. Active step: Electric Orange. Future steps: gray.

---

### Step 1: Specialization

Multi-select chips for sports coached. Selecting a sport reveals sub-specialization chips.

**Preview:**
- Heading: "What sports do you coach?"
- Sport chips: Gym, Running, Tennis, Swimming, Cycling, CrossFit (6 chips, 3×2 grid)
- On select → sub-specialization appears below (e.g., Running → Marathon, Trail, Track, Triathlon)
- "Continue" button (disabled until at least 1 sport selected)

---

### Step 2: Credentials

**Preview:**
- Heading: "Your experience & credentials"
- "Years coaching": number input, up/down stepper
- "Certifications": autocomplete dropdown from curated list (NASM, NSCA, USAW, USATF, ACSM, etc.)
- "Custom credentials": optional text input
- "Continue" button

---

### Step 3: Pricing (placeholder for Free tier)

**Preview:**
- Heading: "Set your pricing"
- "Monthly price": number input with $ prefix
- "Athlete capacity": number input
- Live preview card on the right (desktop) showing what athletes will see
- Suggested pricing hint: "Coaches in your specialty typically charge $79–$149/month."
- "Continue" button

---

### Step 4: First Athlete

**Preview:**
- Heading: "Invite your first athlete"
- Option A: "Send invite by email" → email input + "Send Invite" button
- Option B: "Share invite link" → copyable link with copy button
- "Skip for now" link below CTA
- "Start Coaching" CTA → navigate to `/auth/welcome-dashboard`

---

## 14. Athlete Onboarding

3-step wizard for athletes. Same stepper pattern.

### Step 1: Goals & Sport

**Preview:**
- Heading: "What are you training for?"
- 6 card options in 2×3 grid:
  - Build Muscle, Lose Weight, Run a Marathon, Compete, General Fitness, Recover from Injury
- Below cards: sport selection (same chip UI as coach)
- "Continue" button (disabled until selection)

---

### Step 2: Experience Level

**Preview:**
- Heading: "Your experience level"
- 3 tiered cards (radio select):
  - **Beginner:** "I'm new to structured training. I need guidance on what to do."
  - **Intermediate:** "I can follow structured programming and have some training history."
  - **Advanced:** "I can deadlift 1.5x bodyweight and follow complex periodized programs."
- Each card has a check circle that fills on selection
- "Continue" button

---

### Step 3: Connect with Coach

**Preview:**
- Heading: "Connect with your coach"
- Option A: "Enter invite code" → text input
- Option B: "Search for a coach" → search input with results list
- "Skip" link below CTA
- "Start Training" CTA → navigate to `/auth/welcome-dashboard`

---

## 15. Invitation Flows

### Organization Invitation

User receives an email with a link to `/auth/invite/organization?token=xxx&org=xxx`.

**Screen:**

```
┌────────────────────────────────────┐
│    🏛️                              │  64px
│                                    │
│    You've been invited to          │  H3
│    [Organization Name]             │  H2, text-gradient
│                                    │
│    [Organization Name] uses        │  body-sm
│    MR Training to manage their     │
│    coaching operations.            │
│                                    │
│    You'll join as an               │
│    [Role] member.                  │
│                                    │
│    ┌──────────────────────────┐    │
│    │  Accept Invitation       │    │
│    └──────────────────────────┘    │
│                                    │
│    [Decline]                       │  text link
└────────────────────────────────────┘
```

**Behavior:**
- Non-authenticated → first complete sign-up, then redirect back
- Authenticated → Clerk's `organization.acceptInvitation()` + redirect to dashboard

### Coach Invitation

Similar screen with coaching-specific copy.
- "Coach [Name] has invited you to join their coaching team at [Organization]"
- Accept → navigates to `/auth/setup` → coach dashboard

### Athlete Invitation

- "Coach [Name] has invited you to train with them."
- Accept → navigates to `/auth/setup` → `/auth/onboarding/athlete` → athlete dashboard

---

## 16. Welcome Dashboard

Post-onboarding celebration screen. Brief, emotional, direct.

**Visual:**

```
┌────────────────────────────────────┐
│    ┌──────────────────────────┐    │
│    │     [MR monogram, 80px]  │    │  Animated: pulse + glow
│    │     ✓                    │    │  Success Green check overlay
│    └──────────────────────────┘    │
│                                    │
│    You're all set, [Name]!         │  H1, center
│                                    │
│    Your [Coach/Athlete] account    │  body-lg, text-tertiary
│    is ready to go.                 │
│                                    │
│    ┌──────────────────────────┐    │
│    │  Go to Your Dashboard    │    │  CTA, Electric Orange, pulse glow
│    └──────────────────────────┘    │
│                                    │
│    "Small consistent actions        │  Italic quote, caption
│     lead to extraordinary          │
│     results."                      │
└────────────────────────────────────┘
```

**Behavior:**
- 1s display before CTA appears
- CTA navigates to role-specific dashboard
- MR monogram does a celebration pulse animation (spring, 800ms) with confetti particles

---

## 17. States: Loading, Success, Error

### Loading States

| Screen | Loading Indicator | Position |
|--------|------------------|----------|
| All screens | MR monogram spinner (32px, 1s rotation) | Replaces CTA text |
| OAuth buttons | Spinner inside button, other buttons disabled | Button |
| Code input | 6-digit inputs disabled, last input spinner | Last input |
| Onboarding wizard | Stepper shows loading state on current step | Current step |
| File upload | Progress bar below avatar (linear, indeterminate) | Avatar area |
| Page transitions | Fade out current, fade in next (250ms) | Full page |
| Initial load | Skeleton card matching layout dimensions | Content area |

### Success States

| Screen | Success Indicator | Duration | Next Action |
|--------|------------------|----------|-------------|
| Splash | Full content visible | 2.5s | Auto-navigate |
| Email sent | Green check animation | 800ms | Show next screen |
| Code verified | All inputs turn green, check | 500ms | Auto-advance |
| Password set | Checkmark overlay on button | 500ms | Navigate |
| Role selected | Card highlight with glow | 300ms | Navigate |
| Profile saved | Toast "Profile saved" | 2s auto-dismiss | Navigate |
| Onboarding complete | Celebration pulse + confetti | 1s | Show CTA |
| Invitation accepted | Green check + "Joined!" | 800ms | Navigate |
| Password reset | Green check + "Email sent" | Persistent | User action |

### Error States

| Error Type | Visual | Message Pattern | Action |
|-----------|--------|-----------------|--------|
| Network | Toast (warning, 5s) | "Connection interrupted. Your changes are saved locally." | Auto-retry |
| Invalid email | Inline, red border | "That doesn't look like a valid email." | Fix on type |
| Email not found | Inline banner | "No account found with this email. Check for typos or [create an account →]." | Fix or link |
| Email exists | Inline banner | "An account already exists with this email. [Sign in →]." | Link |
| Wrong password | Inline, red border | "Incorrect password. [Reset password →]." | Fix or link |
| Invalid code | Inline, red border | "That code didn't work. Try again." | Re-enter |
| Code expired | Inline | "Code expired. [Resend new code →]." | Resend |
| MFA failed | Inline | "Incorrect code. Try again or [use a recovery code →]." | Retry |
| OAuth failed | Banner below button | "Google sign-in failed. Try again or use email." | Retry |
| Upload failed | Inline below avatar | "Upload failed. Try a smaller file (max 5MB)." | Retry |
| Save failed | Banner at top | "Couldn't save your changes. Try again." | Retry |
| Invite invalid | Full screen | "This invitation link is invalid or expired. Contact your coach for a new one." | CTA to contact |
| Rate limited | Banner | "Too many attempts. Please wait a moment and try again." | Timer |
| Server error | Toast or banner | "Something went wrong on our end. We've been notified. Try again." | Retry |

---

## 18. Animations

### Page Transitions (AnimatePresence)

| Transition | Duration | Easing | Description |
|-----------|----------|--------|-------------|
| Page enter | 350ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Fade in + translateY(20px → 0) |
| Page exit | 250ms | `cubic-bezier(0.4, 0, 1, 1)` | Fade out + translateY(0 → -12px) |
| Step change (wizard) | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Slide left (forward) / slide right (back) |

### Micro-Animations

| Element | Animation | Duration | Trigger |
|---------|-----------|----------|---------|
| Input focus | Border color, subtle scale | 150ms | Focus |
| Input error | Shake + red border | 300ms | Validation fail |
| Button press | Scale 0.97 | 100ms | Tap |
| Checkmark | Scale 0 → 1, spring | 500ms | Success |
| OAuth button | Hover lift translateY(-2px) | 200ms | Hover |
| Role card | Hover lift + border glow | 300ms | Hover |
| Role selected | Border to Electric Orange + subtle glow | 300ms | Select |
| Code input auto-advance | Subtle scale pulse | 150ms | Digit entered |
| Error banner | Slide down from top | 250ms | Error triggers |
| Toast | Slide in from right | 300ms | Show |
| Stepper progress | Check fill animation | 400ms | Step complete |
| Avatar upload | Ripple effect on circle | 600ms | Upload start |
| Celebration pulse | Scale 1 → 1.05 → 1 | 800ms | Onboarding complete |
| Logo on splash | Scale 0.85 → 1 + fade | 800ms | Splash load |

### Respecting `prefers-reduced-motion`

When reduced motion is detected:
- All page transitions become instant (0ms)
- Micro-animations become instant (0ms) except focus rings and loading spinners
- Celebration pulse becomes static checkmark
- Confetti particles are suppressed
- Splash screen still displays but transitions after 1s (no animation)

---

## 19. Accessibility

### Keyboard Navigation

Every auth screen has a defined tab order:

1. Back button / skip link (first focusable element)
2. Primary input field
3. Secondary input / action
4. Primary CTA button
5. Alternative action (sign in link, forgot password link)

Tab order is linear, visual reading order. No tabindex values except -1 for hidden elements.

### Screen Reader Announcements

| Screen | Page Title | First Announcement |
|--------|-----------|-------------------|
| Splash | "MR Training — Loading" | "MR Training. The operating system for sports performance." |
| Welcome | "Welcome — MR Training" | "Welcome to MR Training. Continue with Google or continue with email." |
| Sign In (email) | "Sign In — MR Training" | "Sign in. Enter your email address." |
| Sign In (password) | "Sign In — MR Training" | "Enter your password for [email]." |
| Sign Up | "Create Account — MR Training" | "Create your account. Enter your email address." |
| Verify | "Verify Email — MR Training" | "We sent a 6-digit code to your email. Enter the code." |
| Forgot Password | "Reset Password — MR Training" | "Reset your password. Enter your email to receive a reset link." |
| MFA | "Two-Factor Auth — MR Training" | "Enter your two-factor authentication code." |
| Role Selection | "Choose Role — MR Training" | "Choose your role. I'm a coach. I'm an athlete. I run an academy. I manage a club." |
| Setup | "Set Up Profile — MR Training" | "Set up your profile. Upload a photo. Enter your name." |
| Onboarding | "Onboarding — MR Training" | "Step [X] of [Y]. [Step title]." |
| Welcome Dashboard | "You're All Set — MR Training" | "Your account is ready. Go to your dashboard." |
| Invitation | "Invitation — MR Training" | "You've been invited to join [Organization]." |

### ARIA Attributes

- All inputs have `aria-label` or `aria-labelledby`
- Error messages use `aria-describedby` on the input
- `role="alert"` on error banners and success messages
- `aria-live="polite"` on toast notifications
- `aria-current="step"` on active stepper step
- Focus is managed on step transitions: moved to the step heading after transition
- Skip link: "Skip to main content" at the very top of auth pages

### Reduced Motion

All animations respect `prefers-reduced-motion: reduce`:
- No page transitions (instant state swaps)
- No micro-animations except focus rings
- Loading spinners remain (informational)
- Celebration becomes static

---

## 20. File Structure

```
apps/web/src/
├── app/
│   └── (auth)/
│       ├── layout.tsx                           # Server Component: ClerkProvider + AuthShell
│       ├── page.tsx                             # Redirect to /auth/welcome
│       ├── welcome/
│       │   └── page.tsx                         # Splash page
│       ├── sign-in/
│       │   └── page.tsx                         # Sign-in flow
│       ├── sign-up/
│       │   └── page.tsx                         # Sign-up flow  
│       ├── forgot-password/
│       │   └── page.tsx                         # Forgot password
│       ├── verify/
│       │   └── page.tsx                         # Email verification
│       ├── mfa/
│       │   └── page.tsx                         # Multi-factor auth
│       ├── role-selection/
│       │   └── page.tsx                         # Role selection
│       ├── setup/
│       │   └── page.tsx                         # Profile setup
│       ├── onboarding/
│       │   ├── coach/
│       │   │   └── page.tsx                     # Coach onboarding wizard
│       │   └── athlete/
│       │       └── page.tsx                     # Athlete onboarding wizard
│       ├── invite/
│       │   ├── organization/
│       │   │   └── page.tsx                     # Org invitation
│       │   ├── coach/
│       │   │   └── page.tsx                     # Coach invitation
│       │   └── athlete/
│       │       └── page.tsx                     # Athlete invitation
│       └── welcome-dashboard/
│           └── page.tsx                         # Post-onboarding celebration
│
├── features/
│   └── auth/
│       ├── components/
│       │   ├── AuthShell.tsx                    # Layout shell (Client Component)
│       │   ├── SplashScreen.tsx                 # Splash animation
│       │   ├── WelcomeScreen.tsx                # Welcome with OAuth
│       │   ├── SignInForm.tsx                   # Email step, password step
│       │   ├── SignUpForm.tsx                   # Email, verify, password steps
│       │   ├── ForgotPasswordForm.tsx           # Email input + success
│       │   ├── VerifyCodeForm.tsx               # 6-digit code input
│       │   ├── MFAForm.tsx                      # MFA method + code
│       │   ├── RoleSelector.tsx                 # 4-card role picker
│       │   ├── ProfileSetupForm.tsx             # Avatar, name, sports
│       │   ├── OnboardingWizard.tsx             # Stepper wizard container
│       │   ├── CoachOnboarding.tsx              # 4-step coach wizard
│       │   ├── AthleteOnboarding.tsx            # 3-step athlete wizard
│       │   ├── InvitationScreen.tsx             # Generic invitation screen
│       │   ├── WelcomeDashboard.tsx             # Celebration screen
│       │   ├── OnboardingStepper.tsx            # Stepper UI component
│       │   ├── CodeInput.tsx                    # 6-digit code input
│       │   └── SocialButton.tsx                 # OAuth provider button
│       ├── hooks/
│       │   ├── useAuthFlow.ts                   # Auth flow state machine
│       │   ├── useCodeInput.ts                  # 6-digit code logic
│       │   └── useOnboarding.ts                 # Onboarding state
│       ├── types/
│       │   └── index.ts                        # Auth types
│       └── index.ts                            # Barrel exports
│
└── middleware.ts                                # Clerk middleware
```
