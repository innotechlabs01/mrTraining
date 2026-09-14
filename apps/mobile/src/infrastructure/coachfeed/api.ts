/**
 * Coach Feed API Client — interfaces with Go API backend for coach posts/reactions/comments.
 */

import { smartClient as apiClient } from '../api/client';

// ─── API Response Types ───────────────────────────────────────────────────────

export interface APIPost {
  id: string;
  coach_id: string;
  coach_name: string;
  content: string;
  media_type: string;
  media_url: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface APIReaction {
  id: string;
  post_id: string;
  athlete_id: string;
  type: string;
  created_at: string;
}

export interface APIComment {
  id: string;
  post_id: string;
  athlete_id: string;
  athlete_name: string;
  content: string;
  created_at: string;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const COACH_FEED_BASE = '/v1/coach/feed';

/**
 * Fetch posts from the API.
 */
export async function fetchPosts(
  limit: number = 20,
  offset: number = 0,
): Promise<APIPost[]> {
  try {
    const response = await apiClient.get<APIPost[]>(
      `${COACH_FEED_BASE}?limit=${limit}&offset=${offset}`,
    );
    return response.data ?? [];
  } catch (error) {
    console.warn('[CoachFeedAPI] fetchPosts failed:', error);
    return [];
  }
}

/**
 * Create a new post via the API.
 */
export async function createPost(data: {
  content: string;
  media_type?: string;
  media_url?: string;
}): Promise<APIPost | null> {
  try {
    const response = await apiClient.post<APIPost>(COACH_FEED_BASE, data);
    return response.data;
  } catch (error) {
    console.warn('[CoachFeedAPI] createPost failed:', error);
    return null;
  }
}

/**
 * Delete a post via the API.
 */
export async function deletePost(postId: string): Promise<boolean> {
  try {
    await apiClient.delete(`${COACH_FEED_BASE}/${postId}`);
    return true;
  } catch (error) {
    console.warn('[CoachFeedAPI] deletePost failed:', error);
    return false;
  }
}

/**
 * Add a reaction to a post via the API.
 */
export async function addReaction(
  postId: string,
  type: string = 'like',
): Promise<boolean> {
  try {
    await apiClient.post(`${COACH_FEED_BASE}/${postId}/react`, { type });
    return true;
  } catch (error) {
    console.warn('[CoachFeedAPI] addReaction failed:', error);
    return false;
  }
}

/**
 * Add a comment to a post via the API.
 */
export async function addComment(
  postId: string,
  content: string,
): Promise<APIComment | null> {
  try {
    const response = await apiClient.post<APIComment>(
      `${COACH_FEED_BASE}/${postId}/comment`,
      { content },
    );
    return response.data;
  } catch (error) {
    console.warn('[CoachFeedAPI] addComment failed:', error);
    return null;
  }
}

/**
 * Fetch comments for a post via the API.
 */
export async function fetchComments(
  postId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<APIComment[]> {
  try {
    const response = await apiClient.get<APIComment[]>(
      `${COACH_FEED_BASE}/${postId}/comments?limit=${limit}&offset=${offset}`,
    );
    return response.data ?? [];
  } catch (error) {
    console.warn('[CoachFeedAPI] fetchComments failed:', error);
    return [];
  }
}
