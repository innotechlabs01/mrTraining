'use client'

import { useState, useEffect, useCallback } from 'react'
import { MOCK_MEALS, MOCK_WATER, MOCK_SUPPLEMENTS, MOCK_POSTS, MOCK_DAILY_SUMMARY } from '../data/_mocks'
import type { Meal, WaterLog, Supplement, TeamPost, DailySummary } from '../types'

export function useNutrition() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [water, setWater] = useState<WaterLog>({ current: 0, goal: 3000 })
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setMeals(MOCK_MEALS)
      setWater(MOCK_WATER)
      setSupplements(MOCK_SUPPLEMENTS)
      setLoading(false)
    }, 700)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const logMeal = useCallback((id: string) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, logged: true } : m))
  }, [])

  const addWater = useCallback((amount: number) => {
    setWater(prev => ({ ...prev, current: Math.min(prev.current + amount, prev.goal) }))
  }, [])

  const takeSupplement = useCallback((id: string) => {
    setSupplements(prev => prev.map(s => s.id === id ? { ...s, taken: true } : s))
  }, [])

  return { meals, water, supplements, loading, error, logMeal, addWater, takeSupplement }
}

export function useCommunity() {
  const [posts, setPosts] = useState<TeamPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setPosts(MOCK_POSTS)
      setLoading(false)
    }, 600)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const cheer = useCallback((id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, cheered: !p.cheered, likes: p.cheered ? p.likes - 1 : p.likes + 1 } : p
    ))
  }, [])

  return { posts, loading, error, cheer }
}

export function useNightSummary() {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setSummary({
        ...MOCK_DAILY_SUMMARY,
        date: new Date().toISOString().split('T')[0],
      })
      setLoading(false)
    }, 900)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  return { summary, loading, error }
}
