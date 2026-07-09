import { useState, useEffect, useCallback } from 'react'
import { mealPlanRepo, recipeRepo, shoppingListRepo } from './seed'
import type { Recipe } from '../domain/recipe'
import type { MealPlan } from '../domain/meal-plan'
import type { ShoppingList } from '../domain/shopping-list'

export function useMealPlans() {
  const [items, setItems] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await mealPlanRepo.findByOrganization('org-456')
      setItems(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meal plans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { items, loading, error, refetch: fetch }
}

export function useMealPlan(id: string) {
  const [item, setItem] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await mealPlanRepo.findById(id)
      setItem(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { item, loading, error, refetch: fetch }
}

export function useRecipes() {
  const [items, setItems] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await recipeRepo.findByOrganization('org-456')
      setItems(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { items, loading, error, refetch: fetch }
}

export function useRecipe(id: string) {
  const [item, setItem] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await recipeRepo.findById(id)
      setItem(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { item, loading, error, refetch: fetch }
}

export function useShoppingLists() {
  const [items, setItems] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await shoppingListRepo.findByAthlete('athlete-123')
      setItems(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shopping lists')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { items, loading, error, refetch: fetch }
}

export function useShoppingList(id: string) {
  const [item, setItem] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await shoppingListRepo.findById(id)
      setItem(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shopping list')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { item, loading, error, refetch: fetch }
}
