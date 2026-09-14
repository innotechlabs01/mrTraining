'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coachFeedApi } from '../api/client'

export function useCoachFeedPosts(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['coach-feed', 'posts', limit, offset],
    queryFn: () => coachFeedApi.getPosts(limit, offset),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: string; media_type?: string; media_url?: string }) =>
      coachFeedApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-feed', 'posts'] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => coachFeedApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-feed', 'posts'] })
    },
  })
}

export function useAddReaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type?: string }) =>
      coachFeedApi.addReaction(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-feed', 'posts'] })
    },
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      coachFeedApi.addComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-feed', 'posts'] })
    },
  })
}

export function useCoachFeedComments(postId: string, limit: number = 20) {
  return useQuery({
    queryKey: ['coach-feed', 'comments', postId, limit],
    queryFn: () => coachFeedApi.getComments(postId, limit),
    staleTime: 2 * 60 * 1000,
    enabled: !!postId,
  })
}
