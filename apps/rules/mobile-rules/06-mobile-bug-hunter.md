# MR Training — Mobile Bug Hunter (QA)

**Version 1.0 — 2026**

---

## 1. QA Engineer Mode

At the end of every task, act as a QA Engineer. Try to break the flow. Find every edge case.

---

## 2. Bug Checklist

### Null / Undefined
- What happens when API returns `null` for an expected object?
- What happens when `response.data` is `undefined`?
- What if `athlete.name` is empty string?

### Race Conditions
- What if user taps "Complete Set" twice rapidly?
- What if they navigate away during a mutation?
- What if they close the app during a sync?

### Network States
- **Offline:** Does the app show cached data + banner?
- **Slow 3G:** Do loaders appear? Does it timeout gracefully?
- **No internet:** Error state with retry?
- **API down (500):** Error state with message?

### User Behavior
- **Double tap:** Does it trigger the action twice?
- **Rapid navigation:** Does the stack handle it?
- **Background → Foreground:** Does data refresh?
- **Rotation:** Does layout adapt?
- **Keyboard open:** Does the view scroll correctly?
- **Accessibility:** VoiceOver/TalkBack navigates correctly?
- **Large text:** Accessibility font scaling respected?

### Device States
- **Low battery mode:** Animations reduced?
- **Dark Mode toggle while app is open:** Transition smooth?
- **Low storage:** Graceful handling?
- **Permission denied:** Camera, notifications, location?
- **Do Not Disturb:** Notifications queued?

### Input Validation
- Empty form submission
- Strings in number fields
- Negative weight/reps
- Future dates for workout completion
- Past dates for scheduling
- Extremely long names (256+ chars)
- Unicode/emoji in text fields
- SQL injection attempts in search
- XSS in text fields (rendered in WebView?)

---

## 3. Regression Prevention

When a bug is found:

1. **Explain it** — what breaks, under what conditions
2. **Show reproduction steps** — exact sequence to trigger
3. **Show the fix** — code change with reasoning
4. **Show root cause** — why did the original code allow this?
5. **Write a test** — unit/integration test that fails before fix, passes after

```typescript
// Example bug report:
//
// BUG: Double-tapping "Complete Set" creates duplicate records
// Reproduction:
//   1. Open today's workout
//   2. Tap "Complete Set" twice rapidly (< 300ms apart)
//   3. Observe: 2 sets are recorded instead of 1
// Root cause: No debounce or disabled state on button
// Fix: Disable button after first press, add isMutating check
// Test: it('prevents duplicate set completion on double tap', ...)
```

---

## 4. Automation Opportunities

Prefer automated checks over manual:

- **Unit tests** — domain logic, hooks, utilities
- **Integration tests** — API + React Query flow
- **Snapshot tests** — component rendering (use sparingly)
- **Maestro E2E** — critical user flows only (sign-in → today → complete workout)

---

## 5. Release Gate

Before marking a feature as "QA Ready":

- [ ] All loading states implemented
- [ ] All error states implemented
- [ ] All empty states implemented
- [ ] All success states implemented
- [ ] All disabled states implemented
- [ ] Offline state implemented
- [ ] Dark mode verified
- [ ] Light mode verified
- [ ] Tablet layout acceptable
- [ ] Small screen (iPhone SE) acceptable
- [ ] Accessibility labels present
- [ ] Keyboard handling correct
- [ ] No crashes on rapid navigation
- [ ] No duplicate requests on double-tap
- [ ] All tests pass (≥ 90% coverage)
- [ ] TypeScript strict: no errors
- [ ] ESLint: no warnings
