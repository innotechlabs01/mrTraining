/**
 * Gamification hooks — React Query integration for streaks, badges, PRs, leaderboard, and coach feed.
 */

export { useStreak, useLogWorkout } from './useStreak';
export { useBadges, useCheckBadges, useNewBadges } from './useBadges';
export { usePRs, useRecordPR } from './usePRs';
export { useGroupLeaderboard, useWeeklyLeaderboard, useLeaderboardHistory } from './useLeaderboard';
export {
  useCoachFeedPosts,
  useCreatePost,
  useDeletePost,
  useAddReaction,
  useAddComment,
  useCoachFeedComments,
} from './useCoachFeed';
