import { useQuery } from '@tanstack/react-query'
import { mealPlanRepo, recipeRepo, shoppingListRepo } from './seed'
import type { Recipe } from '../domain/recipe'
import type { MealPlan } from '../domain/meal-plan'
import type { ShoppingList } from '../domain/shopping-list'

/**
 * All reads go through TanStack Query (per rules/06-frontend-architecture):
 * dedup, cache with staleTime and background refetch. Navigating back to a
 * nutrition screen within the stale window renders instantly with zero
 * network round-trips. The legacy useState+useEffect pattern is retired.
 */

// Freshness: local seed-backed data; 5 min avoids refetch storms while
// keeping edits visible quickly on revisit.
const STALE_MS = 5 * 60_000

/** Normalize query errors to the legacy `{ error: string | null }` contract. */
function messageOf(error: unknown, fallback: string): string | null {
  if (!error) return null
  return error instanceof Error && error.message ? error.message : fallback
}

export function useMealPlans() {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['nutrition', 'meal-plans'],
    queryFn: () => mealPlanRepo.findByOrganization('org-456'),
    staleTime: STALE_MS,
  })

  return {
    items: data,
    loading: isLoading,
    error: messageOf(error, 'Failed to load meal plans'),
    refetch: () => void refetch(),
  }
}

export function useMealPlan(id: string) {
  const { data = null, isLoading, error, refetch } = useQuery({
    queryKey: ['nutrition', 'meal-plans', id],
    queryFn: () => mealPlanRepo.findById(id),
    staleTime: STALE_MS,
    enabled: !!id,
  })

  return {
    item: data,
    loading: isLoading,
    error: messageOf(error, 'Failed to load meal plan'),
    refetch: () => void refetch(),
  }
}

export function useRecipes() {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['nutrition', 'recipes'],
    queryFn: () => recipeRepo.findByOrganization('org-456'),
    staleTime: STALE_MS,
  })

  return {
    items: data,
    loading: isLoading,
    error: messageOf(error, 'Failed to load recipes'),
    refetch: () => void refetch(),
  }
}

export function useRecipe(id: string) {
  const { data = null, isLoading, error, refetch } = useQuery({
    queryKey: ['nutrition', 'recipes', id],
    queryFn: () => recipeRepo.findById(id),
    staleTime: STALE_MS,
    enabled: !!id,
  })

  return {
    item: data,
    loading: isLoading,
    error: messageOf(error, 'Failed to load recipe'),
    refetch: () => void refetch(),
  }
}

export function useShoppingLists() {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['nutrition', 'shopping-lists'],
    queryFn: () => shoppingListRepo.findByAthlete('athlete-123'),
    staleTime: STALE_MS,
  })

  return {
    items: data,
    loading: isLoading,
    error: messageOf(error, 'Failed to load shopping lists'),
    refetch: () => void refetch(),
  }
}

export function useShoppingList(id: string) {
  const { data = null, isLoading, error, refetch } = useQuery({
    queryKey: ['nutrition', 'shopping-lists', id],
    queryFn: () => shoppingListRepo.findById(id),
    staleTime: STALE_MS,
    enabled: !!id,
  })

  return {
    item: data,
    loading: isLoading,
    error: messageOf(error, 'Failed to load shopping list'),
    refetch: () => void refetch(),
  }
}
