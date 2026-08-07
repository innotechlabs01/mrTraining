'use client'

import { useEffect, useState, useCallback } from 'react'
import type { BlogPost } from '@/features/coach/types'
import { coachingApi } from '@/features/shared/api/client'

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const loadPosts = useCallback(() => {
    setIsLoading(true)
    coachingApi.getBlogPosts<BlogPost[]>()
      .then(data => {
        setPosts(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => { setIsLoading(false); setHydrated(true) })
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const addPost = useCallback(async (data: Omit<BlogPost, 'id' | 'createdAt'>) => {
    const res = await coachingApi.saveBlogPost<{ id: string }>(data)
    setPosts(prev => [
      { ...data, id: res.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...prev,
    ])
  }, [])

  const updatePost = useCallback(async (id: string, patch: Partial<BlogPost>) => {
    const current = posts.find(p => p.id === id)
    if (!current) return
    const updated = { ...current, ...patch }
    await coachingApi.updateBlogPost(id, updated)
    setPosts(prev => prev.map(p => p.id === id ? updated : p))
  }, [posts])

  const removePost = useCallback(async (id: string) => {
    await coachingApi.deleteBlogPost(id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }, [])

  return { posts, isLoading, hydrated, addPost, updatePost, removePost, refresh: loadPosts }
}
