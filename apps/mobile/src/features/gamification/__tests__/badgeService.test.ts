import {
  evaluateBadges,
  findNewBadges,
  getBadgeById,
  getBadgesByCategory,
  BADGE_DEFINITIONS,
} from '../domain/badgeService';

test('returns empty when no stats meet thresholds', () => {
  const result = evaluateBadges({
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    totalPRs: 0,
    feedInteractions: 0,
  });
  expect(result).toHaveLength(0);
});

test('unlocks streak-3 badge at threshold', () => {
  const result = evaluateBadges({
    currentStreak: 3,
    longestStreak: 3,
    totalWorkouts: 0,
    totalPRs: 0,
    feedInteractions: 0,
  });
  expect(result.map((b) => b.badgeId)).toContain('streak-3');
});

test('unlocks streak-7 badge (not streak-3) at exactly 7', () => {
  const result = evaluateBadges({
    currentStreak: 7,
    longestStreak: 7,
    totalWorkouts: 0,
    totalPRs: 0,
    feedInteractions: 0,
  });
  const ids = result.map((b) => b.badgeId);
  expect(ids).toContain('streak-3');
  expect(ids).toContain('streak-7');
  expect(ids).not.toContain('streak-14');
});

test('unlocks workout badges at thresholds', () => {
  const result = evaluateBadges({
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 50,
    totalPRs: 0,
    feedInteractions: 0,
  });
  const ids = result.map((b) => b.badgeId);
  expect(ids).toContain('workout-10');
  expect(ids).toContain('workout-50');
  expect(ids).not.toContain('workout-100');
});

test('unlocks PR badge', () => {
  const result = evaluateBadges({
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    totalPRs: 1,
    feedInteractions: 0,
  });
  expect(result.map((b) => b.badgeId)).toContain('pr-1');
});

test('unlocks social badge', () => {
  const result = evaluateBadges({
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    totalPRs: 0,
    feedInteractions: 5,
  });
  expect(result.map((b) => b.badgeId)).toContain('social-5');
});

test('findNewBadges returns only newly unlocked', () => {
  const current = [
    { badgeId: 'streak-3', unlockedAt: '2026-01-01' },
    { badgeId: 'streak-7', unlockedAt: '2026-01-08' },
  ];
  const previous = [{ badgeId: 'streak-3', unlockedAt: '2026-01-01' }];
  const newOnes = findNewBadges(current, previous);
  expect(newOnes).toHaveLength(1);
  expect(newOnes[0].badgeId).toBe('streak-7');
});

test('findNewBadges returns empty when nothing new', () => {
  const current = [{ badgeId: 'streak-3', unlockedAt: '2026-01-01' }];
  const previous = [{ badgeId: 'streak-3', unlockedAt: '2026-01-01' }];
  expect(findNewBadges(current, previous)).toHaveLength(0);
});

test('getBadgeById returns correct badge', () => {
  const badge = getBadgeById('streak-7');
  expect(badge).toBeDefined();
  expect(badge!.title).toBe('Semana Perfecta');
  expect(badge!.category).toBe('streak');
});

test('getBadgeById returns undefined for unknown id', () => {
  expect(getBadgeById('nonexistent')).toBeUndefined();
});

test('getBadgesByCategory filters correctly', () => {
  const streakBadges = getBadgesByCategory('streak');
  expect(streakBadges.every((b) => b.category === 'streak')).toBe(true);
  expect(streakBadges.length).toBeGreaterThan(0);
});

test('all badge definitions have required fields', () => {
  for (const badge of BADGE_DEFINITIONS) {
    expect(badge.id).toBeTruthy();
    expect(badge.title).toBeTruthy();
    expect(badge.description).toBeTruthy();
    expect(badge.threshold).toBeGreaterThan(0);
  }
});
