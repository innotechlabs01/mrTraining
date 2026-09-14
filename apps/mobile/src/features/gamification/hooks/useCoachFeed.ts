/**
 * useCoachFeed hook — React Query integration for coach feed.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPosts,
  createPost,
  deletePost,
  addReaction,
  addComment,
  fetchComments,
  type APIPost,
  type APIComment,
} from '../../../infrastructure/coachfeed/api';

const COACH_FEED_QUERY_KEY = ['gamification', 'coach-feed'];

/**
 * Hook to fetch coach feed posts.
 */
export function useCoachFeedPosts(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: [...COACH_FEED_QUERY_KEY, 'posts', limit, offset],
    queryFn: () => fetchPosts(limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to create a new post.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; media_type?: string; media_url?: string }) =>
      createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...COACH_FEED_QUERY_KEY, 'posts'] });
    },
  });
}

/**
 * Hook to delete a post.
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...COACH_FEED_QUERY_KEY, 'posts'] });
    },
  });
}

/**
 * Hook to add a reaction to a post.
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type?: string }) =>
      addReaction(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...COACH_FEED_QUERY_KEY, 'posts'] });
    },
  });
}

/**
 * Hook to add a comment to a post.
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      addComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...COACH_FEED_QUERY_KEY, 'posts'] });
    },
  });
}

/**
 * Hook to fetch comments for a post.
 */
export function useCoachFeedComments(postId: string, limit: number = 20) {
  return useQuery({
    queryKey: [...COACH_FEED_QUERY_KEY, 'comments', postId, limit],
    queryFn: () => fetchComments(postId, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!postId,
  });
}
