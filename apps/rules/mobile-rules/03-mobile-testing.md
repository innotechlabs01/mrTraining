# MR Training — Mobile Testing

**Version 1.0 — 2026**

---

## 1. Testing Philosophy

**Every feature has tests.** No feature is complete without tests. Tests are not optional. A PR without tests is an incomplete PR.

**Test behavior, not implementation.** Tests should verify what the code does, not how it does it.

**Tests are documentation.** Test names should read like sentences: "shows error when workout ID is invalid".

**Coverage minimum: 90%** across lines, branches, functions.

---

## 2. Test Types

### 2.1 Unit Tests (Jest + React Native Testing Library)

```typescript
describe('WorkoutCard', () => {
  it('renders workout name', () => {
    const { getByText } = render(<WorkoutCard workout={mockWorkout} />);
    expect(getByText('Upper Body Strength')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<WorkoutCard workout={mockWorkout} onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(mockWorkout.id);
  });

  it('shows skeleton when loading', () => { /* ... */ });
  it('shows error state on failure', () => { /* ... */ });
  it('handles empty workout list', () => { /* ... */ });
});
```

### 2.2 Domain Logic Tests

```typescript
describe('calculateTrainingLoad', () => {
  it('returns correct load for 5 sets at 100kg', () => {
    expect(calculateTrainingLoad(100, 5, 8)).toBe(4000);
  });

  it('returns 0 for 0 weight', () => {
    expect(calculateTrainingLoad(0, 5, 8)).toBe(0);
  });

  it('throws for negative weight', () => {
    expect(() => calculateTrainingLoad(-1, 5, 8)).toThrow();
  });
});
```

### 2.3 Hook Tests

```typescript
describe('useWorkoutData', () => {
  it('returns loading state initially', async () => {
    const { result } = renderHook(() => useWorkoutData('123'));
    expect(result.current.isLoading).toBe(true);
  });

  it('returns workout data on success', async () => {
    mockApi.getWorkout.mockResolvedValue(mockWorkout);
    const { result } = renderHook(() => useWorkoutData('123'));
    await waitFor(() => expect(result.current.data).toEqual(mockWorkout));
  });

  it('returns error on failure', async () => { /* ... */ });
});
```

### 2.4 Integration Tests

Test React Query hooks with real API mocks (MSW or similar):

```typescript
describe('useAthleteProfile', () => {
  it('fetches and caches athlete data', async () => { /* ... */ });
  it('refetches on focus', async () => { /* ... */ });
  it('handles network error gracefully', async () => { /* ... */ });
});
```

---

## 3. Test Coverage Requirements

| Layer | Coverage Target |
|-------|----------------|
| Domain entities / value objects | 95% |
| Use cases | 90% |
| Repository implementations | 85% |
| UI components | 80% |
| Custom hooks | 90% |
| Utility functions | 95% |
| **Overall** | **90%** |

---

## 4. What NOT to Test

- React Native built-in components (Text, View, ScrollView)
- Third-party library internals (Clerk SDK, React Query cache)
- Visual appearance (exact pixel positions — use snapshot tests sparingly)
- Implementation details (internal state, private methods)

---

## 5. Bug Fixes

When fixing a bug:

1. **Explain the problem** — what broke and why
2. **Explain the impact** — what users experienced
3. **Show the fix** — code change with reasoning
4. **Show why it occurred** — root cause analysis
5. **Create a test** — regression test that fails before fix, passes after

---

## 6. Pre-Commit Checklist

Before committing, verify:

- `tsc --noEmit` — no type errors
- `eslint` — no warnings, no errors
- `prettier --check` — formatted correctly
- `jest --coverage` — all tests pass, coverage ≥ 90%
- `npm run build` (or `npx react-native bundle`) — builds successfully

**Do not deliver code with failing tests.**
