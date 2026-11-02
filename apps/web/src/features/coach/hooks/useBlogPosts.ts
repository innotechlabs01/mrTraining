'use client'

import { useEffect, useState, useCallback } from 'react'
import type { BlogPost } from '@/features/coach/types'
import { goClient } from '@/lib/api/go-client'

// Go API response shape (snake_case).
type GoArticle = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author_id: string
  category: string
  image_url?: string
  is_published: boolean
  published_at: string | null
  tags?: string[]
  read_time_minutes?: number
  views?: number
  created_at: string
  updated_at: string
}

function mapArticle(a: GoArticle): BlogPost {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    content: a.content,
    category: a.category,
    tags: a.tags ?? [],
    imageUrl: a.image_url ?? '',
    isPublished: a.is_published,
    publishedAt: a.published_at,
    coachId: a.author_id,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    readTimeMinutes: a.read_time_minutes ?? 5,
    views: a.views ?? 0,
  }
}

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const loadPosts = useCallback(() => {
    setIsLoading(true)
    goClient.get<GoArticle[]>('/api/v1/coach/blog')
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setPosts(list.map(mapArticle))
      })
      .catch(() => {})
      .finally(() => { setIsLoading(false); setHydrated(true) })
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const addPost = useCallback(async (data: Omit<BlogPost, 'id' | 'createdAt'>) => {
    const created = await goClient.post<GoArticle>('/api/v1/blog', {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      category: data.category,
      tags: data.tags,
      image_url: data.imageUrl,
      is_published: data.isPublished,
      published_at: data.publishedAt,
      read_time_minutes: data.readTimeMinutes,
    })
    setPosts(prev => [mapArticle(created), ...prev])
  }, [])

  const updatePost = useCallback(async (id: string, patch: Partial<BlogPost>) => {
    const current = posts.find(p => p.id === id)
    if (!current) return
    const merged: BlogPost = { ...current, ...patch }
    const updated = await goClient.put<GoArticle>(`/api/v1/blog/${id}`, {
      title: merged.title,
      slug: merged.slug,
      excerpt: merged.excerpt,
      content: merged.content,
      category: merged.category,
      tags: merged.tags,
      image_url: merged.imageUrl,
      is_published: merged.isPublished,
      published_at: merged.publishedAt,
      read_time_minutes: merged.readTimeMinutes,
    })
    setPosts(prev => prev.map(p => p.id === id ? mapArticle(updated) : p))
  }, [posts])

  const removePost = useCallback(async (id: string) => {
    await goClient.delete(`/api/v1/blog/${id}`)
    setPosts(prev => prev.filter(p => p.id !== id))
  }, [])

  return { posts, isLoading, hydrated, addPost, updatePost, removePost, refresh: loadPosts }
}