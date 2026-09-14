/**
 * Tests for Gamification API Client — verifies API integration with mocked axios.
 */

import {
  fetchStreak,
  logWorkoutDay,
  fetchBadges,
  checkBadges,
  fetchPRs,
  recordPR,
} from '../api';

// Mock the apiClient
jest.mock('../../../infrastructure/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { smartClient as apiClient } from '../../../infrastructure/api/client';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

describe('Gamification API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchStreak', () => {
    it('returns streak data on success', async () => {
      const mockStreak = {
        id: 'streak-1',
        athlete_id: 'athlete-1',
        current_streak: 5,
        longest_streak: 10,
        last_workout_date: '2026-09-09',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-09T00:00:00Z',
      };
      mockGet.mockResolvedValue({ data: mockStreak });

      const result = await fetchStreak();

      expect(result).toEqual(mockStreak);
      expect(mockGet).toHaveBeenCalledWith('/v1/gamification/streak');
    });

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await fetchStreak();

      expect(result).toBeNull();
    });
  });

  describe('logWorkoutDay', () => {
    it('returns updated streak on success', async () => {
      const mockStreak = {
        id: 'streak-1',
        athlete_id: 'athlete-1',
        current_streak: 6,
        longest_streak: 10,
        last_workout_date: '2026-09-10',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-10T00:00:00Z',
      };
      mockPost.mockResolvedValue({ data: mockStreak });

      const result = await logWorkoutDay({
        workout_date: '2026-09-10',
        workout_type: 'strength',
        duration_minutes: 60,
        calories_burned: 400,
      });

      expect(result).toEqual(mockStreak);
      expect(mockPost).toHaveBeenCalledWith('/v1/gamification/streak', {
        workout_date: '2026-09-10',
        workout_type: 'strength',
        duration_minutes: 60,
        calories_burned: 400,
      });
    });

    it('returns null on error', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await logWorkoutDay({ workout_date: '2026-09-10' });

      expect(result).toBeNull();
    });
  });

  describe('fetchBadges', () => {
    it('returns badges array on success', async () => {
      const mockBadges = [
        { id: 'b1', athlete_id: 'a1', badge_id: 'streak-3', unlocked_at: '2026-09-01T00:00:00Z' },
        { id: 'b2', athlete_id: 'a1', badge_id: 'workout-10', unlocked_at: '2026-09-05T00:00:00Z' },
      ];
      mockGet.mockResolvedValue({ data: mockBadges });

      const result = await fetchBadges();

      expect(result).toEqual(mockBadges);
      expect(mockGet).toHaveBeenCalledWith('/v1/gamification/badges');
    });

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await fetchBadges();

      expect(result).toEqual([]);
    });
  });

  describe('checkBadges', () => {
    it('returns new badges on success', async () => {
      const mockBadges = [
        { id: 'b3', athlete_id: 'a1', badge_id: 'streak-7', unlocked_at: '2026-09-10T00:00:00Z' },
      ];
      mockPost.mockResolvedValue({ data: mockBadges });

      const result = await checkBadges({
        totalWorkouts: 15,
        totalPRs: 2,
        feedInteractions: 0,
      });

      expect(result).toEqual(mockBadges);
      expect(mockPost).toHaveBeenCalledWith('/v1/gamification/badges', {
        totalWorkouts: 15,
        totalPRs: 2,
        feedInteractions: 0,
      });
    });

    it('returns empty array on error', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await checkBadges({ totalWorkouts: 0, totalPRs: 0, feedInteractions: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('fetchPRs', () => {
    it('returns PRs array on success', async () => {
      const mockPRs = [
        {
          id: 'pr1',
          athlete_id: 'a1',
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          best_value: 100,
          unit: 'kg',
          achieved_at: '2026-09-01T00:00:00Z',
          previous_best: 90,
        },
      ];
      mockGet.mockResolvedValue({ data: mockPRs });

      const result = await fetchPRs();

      expect(result).toEqual(mockPRs);
      expect(mockGet).toHaveBeenCalledWith('/v1/gamification/prs');
    });

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await fetchPRs();

      expect(result).toEqual([]);
    });
  });

  describe('recordPR', () => {
    it('returns PR result on success', async () => {
      const mockResult = {
        pr: {
          id: 'pr2',
          athlete_id: 'a1',
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          best_value: 110,
          unit: 'kg',
          achieved_at: '2026-09-10T00:00:00Z',
          previous_best: 100,
        },
        is_new_pr: true,
        previous_best: 100,
      };
      mockPost.mockResolvedValue({ data: mockResult });

      const result = await recordPR({
        exercise_id: 'ex1',
        exercise_name: 'Bench Press',
        value: 110,
        unit: 'kg',
      });

      expect(result).toEqual(mockResult);
      expect(mockPost).toHaveBeenCalledWith('/v1/gamification/prs', {
        exercise_id: 'ex1',
        exercise_name: 'Bench Press',
        value: 110,
        unit: 'kg',
      });
    });

    it('returns null on error', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await recordPR({
        exercise_id: 'ex1',
        exercise_name: 'Bench Press',
        value: 110,
        unit: 'kg',
      });

      expect(result).toBeNull();
    });
  });
});
