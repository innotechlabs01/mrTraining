import {
  mealPlanRepo, recipeRepo, shoppingListRepo
} from '../../data/seed'

describe('Seed Data Integration', () => {
  it('should seed meal plans into the repository', async () => {
    const plans = await mealPlanRepo.findByOrganization('org-456')
    expect(plans.length).toBeGreaterThanOrEqual(3)
    expect(plans[0].name).toBeDefined()
    expect(plans[0].nutritionGoals.targetCalories).toBeGreaterThan(0)
  })

  it('should seed recipes with full nutrition data', async () => {
    const recipes = await recipeRepo.findByOrganization('org-456')
    expect(recipes.length).toBeGreaterThanOrEqual(5)
    const pancake = recipes.find((r) => r.name === 'Protein Pancakes')
    expect(pancake).toBeDefined()
    expect(pancake!.ingredients.length).toBeGreaterThan(0)
    expect(pancake!.instructions.length).toBeGreaterThan(0)
  })

  it('should seed shopping lists with items', async () => {
    const lists = await shoppingListRepo.findByAthlete('athlete-123')
    expect(lists.length).toBeGreaterThanOrEqual(3)
    const first = lists[0]
    expect(first.items.length).toBeGreaterThan(0)
    expect(first.purchasedCount).toBeGreaterThan(0)
  })

  it('should have an active meal plan', async () => {
    const plans = await mealPlanRepo.findByOrganization('org-456')
    const active = plans.find((p) => p.status === 'active')
    expect(active).toBeDefined()
    expect(active!.meals.length).toBeGreaterThan(0)
  })
})

describe('Meal Plan to Card Data Mapping', () => {
  it('should map meal plan domain to card props', async () => {
    const plans = await mealPlanRepo.findByOrganization('org-456')
    const plan = plans[0]
    const cardProps = {
      id: plan.id,
      name: plan.name,
      startDate: plan.startDate,
      endDate: plan.endDate,
      mealCount: plan.meals.length,
      calories: plan.nutritionGoals.targetCalories,
      protein: plan.nutritionGoals.targetProtein,
      carbs: plan.nutritionGoals.targetCarbs,
      fat: plan.nutritionGoals.targetFat,
      status: plan.status,
    }
    expect(cardProps.mealCount).toBeDefined()
    expect(typeof cardProps.calories).toBe('number')
    expect(['draft', 'active', 'completed', 'archived']).toContain(cardProps.status)
  })
})

describe('Recipe to Card Data Mapping', () => {
  it('should map recipe domain to card props', async () => {
    const recipes = await recipeRepo.findByOrganization('org-456')
    const recipe = recipes[0]
    const cardProps = {
      id: recipe.id,
      name: recipe.name,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      calories: recipe.calories ?? 0,
      protein: recipe.protein ?? 0,
      tags: recipe.tags,
    }
    expect(cardProps.name).toBeDefined()
    expect(['easy', 'medium', 'hard']).toContain(cardProps.difficulty)
    expect(typeof cardProps.calories).toBe('number')
  })
})

describe('Shopping List to Card Data Mapping', () => {
  it('should map shopping list domain to card props', async () => {
    const lists = await shoppingListRepo.findByAthlete('athlete-123')
    const list = lists[0]
    const cardProps = {
      id: list.id,
      name: list.name,
      description: list.description,
      itemCount: list.items.length,
      purchasedCount: list.purchasedCount,
      createdAt: list.createdAt,
    }
    expect(cardProps.itemCount).toBeGreaterThan(0)
    expect(cardProps.purchasedCount).toBeGreaterThanOrEqual(0)
    expect(typeof cardProps.createdAt).toBe('string')
  })
})

describe('Meal Schedule to View Data Mapping', () => {
  it('should build day schedules from meal plan meals', async () => {
    const plans = await mealPlanRepo.findByOrganization('org-456')
    const plan = plans[0]
    const dayMap = new Map<string, { day: string; meals: { type: string; calories: number; foodCount: number }[]; totalCalories: number }>()
    for (const meal of plan.meals) {
      if (!dayMap.has(meal.dayOfWeek)) {
        dayMap.set(meal.dayOfWeek, { day: meal.dayOfWeek, meals: [], totalCalories: 0 })
      }
      const entry = dayMap.get(meal.dayOfWeek)!
      const mealCals = meal.foods.reduce((sum, f) => sum + f.calories, 0)
      entry.meals.push({ type: meal.mealType, calories: mealCals, foodCount: meal.foods.length })
      entry.totalCalories += mealCals
    }
    const daySchedules = Array.from(dayMap.values())
    expect(daySchedules.length).toBeGreaterThan(0)
    expect(daySchedules[0].totalCalories).toBeGreaterThan(0)
  })
})
