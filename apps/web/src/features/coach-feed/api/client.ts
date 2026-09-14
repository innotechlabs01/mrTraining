import { goFetch } from '@/lib/api/go-client'

export interface CoachPost {
  id: string
  coach_id: string
  coach_name: string
  content: string
  media_type: string
  media_url: string
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface CoachComment {
  id: string
  post_id: string
  athlete_id: string
  athlete_name: string
  content: string
  created_at: string
}

export const coachFeedApi = {
  getPosts: (limit: number = 20, offset: number = 0) =>
    goFetch<CoachPost[]>(`/api/v1/coach/feed?limit=${limit}&offset=${offset}`),

  createPost: (data: { content: string; media_type?: string; media_url?: string }) =>
    goFetch<CoachPost>('/api/v1/coach/feed', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePost: (postId: string) =>
    goFetch<void>(`/api/v1/coach/feed/${postId}`, { method: 'DELETE' }),

  addReaction: (postId: string, type: string = 'like') =>
    goFetch<void>(`/api/v1/coach/feed/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  addComment: (postId: string, content: string) =>
    goFetch<CoachComment>(`/api/v1/coach/feed/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getComments: (postId: string, limit: number = 20, offset: number = 0) =>
    goFetch<CoachComment[]>(`/api/v1/coach/feed/${postId}/comments?limit=${limit}&offset=${offset}`),
}
