/**
 * Badge System — unlockable achievements based on streaks, workouts, PRs, and social activity.
 * Medium gamification: streaks + badges + PRs + weekly challenges + group leaderboards.
 *
 * Syncs with Go API backend when available, falls back to local evaluation.
 */

import {
  fetchBadges as apiFetchBadges,
  checkBadges as apiCheckBadges,
  type APIBadge,
} from '../../../infrastructure/gamification/api';

export type BadgeCategory = 'streak' | 'workout' | 'pr' | 'social';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  /** Icon name — maps to a component in shared/components/icons */
  icon: string;
  /** Threshold to unlock (meaning depends on category) */
  threshold: number;
}

export interface UserBadge {
  badgeId: string;
  unlockedAt: string; // ISO date
}

/** All available badges in the system. */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Streak badges
  { id: 'streak-3', title: 'Constancia', description: '3 días seguidos entrenando', category: 'streak', icon: 'FireIcon', threshold: 3 },
  { id: 'streak-7', title: 'Semana Perfecta', description: '7 días seguidos entrenando', category: 'streak', icon: 'FireIcon', threshold: 7 },
  { id: 'streak-14', title: 'Imparable', description: '14 días seguidos entrenando', category: 'streak', icon: 'FireIcon', threshold: 14 },
  { id: 'streak-30', title: 'Centurión', description: '30 días seguidos entrenando', category: 'streak', icon: 'FireIcon', threshold: 30 },

  // Workout count badges
  { id: 'workout-10', title: 'Primeros Pasos', description: '10 entrenamientos completados', category: 'workout', icon: 'BarbellIcon', threshold: 10 },
  { id: 'workout-50', title: 'Dedicación', description: '50 entrenamientos completados', category: 'workout', icon: 'BarbellIcon', threshold: 50 },
  { id: 'workout-100', title: 'Centenario', description: '100 entrenamientos completados', category: 'workout', icon: 'BarbellIcon', threshold: 100 },

  // PR badges
  { id: 'pr-1', title: 'Primera Marca', description: 'Primer récord personal registrado', category: 'pr', icon: 'TrophyIcon', threshold: 1 },
  { id: 'pr-10', title: 'Récords Rotos', description: '10 récords personales alcanzados', category: 'pr', icon: 'TrophyIcon', threshold: 10 },

  // Social badges
  { id: 'social-5', title: 'Compañero', description: '5 interacciones en el feed del coach', category: 'social', icon: 'ChatIcon', threshold: 5 },
];

/**
 * Determine which badges are unlocked given the user's stats.
 */
export function evaluateBadges(stats: {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalPRs: number;
  feedInteractions: number;
}): UserBadge[] {
  const unlocked: UserBadge[] = [];
  const now = new Date().toISOString();

  for (const badge of BADGE_DEFINITIONS) {
    let earned = false;
    switch (badge.category) {
      case 'streak':
        earned = stats.longestStreak >= badge.threshold;
        break;
      case 'workout':
        earned = stats.totalWorkouts >= badge.threshold;
        break;
      case 'pr':
        earned = stats.totalPRs >= badge.threshold;
        break;
      case 'social':
        earned = stats.feedInteractions >= badge.threshold;
        break;
    }
    if (earned) {
      unlocked.push({ badgeId: badge.id, unlockedAt: now });
    }
  }

  return unlocked;
}

/**
 * Find newly unlocked badges by comparing current evaluation against previously unlocked.
 */
export function findNewBadges(
  currentUnlocked: UserBadge[],
  previouslyUnlocked: UserBadge[],
): UserBadge[] {
  const prevIds = new Set(previouslyUnlocked.map((b) => b.badgeId));
  return currentUnlocked.filter((b) => !prevIds.has(b.badgeId));
}

/** Look up a badge definition by ID. */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

/** Get all badges for a specific category. */
export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((b) => b.category === category);
}

// ─── API-Synced Functions ─────────────────────────────────────────────────────

/**
 * Fetch user badges from API, converting to local UserBadge format.
 * Returns empty array if API unavailable (caller should use local fallback).
 */
export async function fetchBadgesFromAPI(): Promise<UserBadge[]> {
  const apiBadges = await apiFetchBadges();
  if (apiBadges.length === 0) return [];

  return apiBadges.map((b) => ({
    badgeId: b.badge_id,
    unlockedAt: b.unlocked_at,
  }));
}

/**
 * Check for newly unlocked badges via API.
 * Returns newly unlocked badges, or empty array if API unavailable.
 */
export async function checkBadgesFromAPI(stats: {
  totalWorkouts: number;
  totalPRs: number;
  feedInteractions: number;
}): Promise<UserBadge[]> {
  const apiBadges = await apiCheckBadges(stats);
  if (apiBadges.length === 0) return [];

  return apiBadges.map((b) => ({
    badgeId: b.badge_id,
    unlockedAt: b.unlocked_at,
  }));
}
