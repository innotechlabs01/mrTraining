import { ShoppingItem } from '../domain/shopping-item'
import { ShoppingList } from '../domain/shopping-list'
import { Recipe } from '../domain/recipe'
import { MealPlan, MealSchedule, NutritionGoals } from '../domain/meal-plan'
import { InMemoryMealPlanRepository } from '../infrastructure/repositories/in-memory-meal-plan-repository'
import { InMemoryRecipeRepository } from '../infrastructure/repositories/in-memory-recipe-repository'
import { InMemoryShoppingListRepository } from '../infrastructure/repositories/in-memory-shopping-list-repository'

export const mealPlanRepo = new InMemoryMealPlanRepository()
export const recipeRepo = new InMemoryRecipeRepository()
export const shoppingListRepo = new InMemoryShoppingListRepository()

function seed() {
  const athleteId = 'athlete-123'
  const orgId = 'org-456'
  const userId = 'test-user-123'

  const recipes = [
    Recipe.create({
      name: 'Protein Pancakes', athleteId, organizationId: orgId,
      servings: 2, difficulty: 'easy', prepTime: 10, cookTime: 15,
      tags: ['breakfast', 'high-protein', 'quick'],
      ingredients: [
        { id: crypto.randomUUID(), name: 'Eggs', quantity: 3, unit: 'pieces', category: 'protein', calories: 72, protein: 6, carbs: 0.4, fat: 5, sodium: 70 },
        { id: crypto.randomUUID(), name: 'Oats', quantity: 100, unit: 'g', category: 'grain', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 10, sugar: 1 },
        { id: crypto.randomUUID(), name: 'Protein Powder', quantity: 1, unit: 'scoop', category: 'protein', calories: 120, protein: 25, carbs: 3, fat: 1.5 },
        { id: crypto.randomUUID(), name: 'Banana', quantity: 1, unit: 'piece', category: 'fruit', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14 },
      ],
      instructions: ['Mix all ingredients in a bowl until smooth', 'Heat a non-stick pan over medium heat', 'Pour batter and cook 2-3 min per side', 'Serve with fresh fruit'],
    }, userId),
    Recipe.create({
      name: 'Grilled Chicken Salad', athleteId, organizationId: orgId,
      servings: 1, difficulty: 'easy', prepTime: 15, cookTime: 20,
      tags: ['lunch', 'low-carb', 'quick'],
      ingredients: [
        { id: crypto.randomUUID(), name: 'Chicken Breast', quantity: 200, unit: 'g', category: 'protein', calories: 330, protein: 62, carbs: 0, fat: 7, sodium: 160 },
        { id: crypto.randomUUID(), name: 'Mixed Greens', quantity: 100, unit: 'g', category: 'vegetable', calories: 20, protein: 2, carbs: 3.5, fat: 0.2, fiber: 2 },
        { id: crypto.randomUUID(), name: 'Olive Oil', quantity: 15, unit: 'ml', category: 'fat', calories: 119, protein: 0, carbs: 0, fat: 13.5 },
      ],
      instructions: ['Season chicken with salt and pepper', 'Grill 6-7 min per side', 'Toss greens with olive oil', 'Slice chicken and serve over greens'],
    }, userId),
    Recipe.create({
      name: 'Salmon with Veggies', athleteId, organizationId: orgId,
      servings: 2, difficulty: 'medium', prepTime: 10, cookTime: 25,
      tags: ['dinner', 'high-protein'],
      ingredients: [
        { id: crypto.randomUUID(), name: 'Salmon Fillet', quantity: 300, unit: 'g', category: 'protein', calories: 600, protein: 60, carbs: 0, fat: 38 },
        { id: crypto.randomUUID(), name: 'Broccoli', quantity: 200, unit: 'g', category: 'vegetable', calories: 68, protein: 5.6, carbs: 14, fat: 0.8, fiber: 5.4 },
        { id: crypto.randomUUID(), name: 'Sweet Potato', quantity: 200, unit: 'g', category: 'vegetable', calories: 180, protein: 4, carbs: 42, fat: 0.3, fiber: 6.6 },
        { id: crypto.randomUUID(), name: 'Lemon', quantity: 1, unit: 'piece', category: 'fruit', calories: 17, protein: 0.6, carbs: 5.4, fat: 0.2, fiber: 1.6 },
      ],
      instructions: ['Preheat oven to 400F', 'Season salmon with lemon and herbs', 'Roast vegetables with olive oil for 20 min', 'Add salmon and cook 12-15 min'],
    }, userId),
    Recipe.create({
      name: 'Veggie Stir Fry', athleteId, organizationId: orgId,
      servings: 2, difficulty: 'easy', prepTime: 10, cookTime: 10,
      tags: ['dinner', 'vegan', 'quick', 'low-carb'],
      ingredients: [
        { id: crypto.randomUUID(), name: 'Tofu', quantity: 200, unit: 'g', category: 'protein', calories: 152, protein: 16, carbs: 4, fat: 8.8 },
        { id: crypto.randomUUID(), name: 'Bell Peppers', quantity: 150, unit: 'g', category: 'vegetable', calories: 39, protein: 1.5, carbs: 9, fat: 0.3, fiber: 3.1 },
        { id: crypto.randomUUID(), name: 'Soy Sauce', quantity: 30, unit: 'ml', category: 'other', calories: 20, protein: 2, carbs: 3, sodium: 2900 },
      ],
      instructions: ['Press and cube tofu', 'Stir fry vegetables for 3 min', 'Add tofu and soy sauce', 'Cook 2 more minutes and serve'],
    }, userId),
    Recipe.create({
      name: 'Overnight Oats', athleteId, organizationId: orgId,
      servings: 1, difficulty: 'easy', prepTime: 5, cookTime: 0,
      tags: ['breakfast', 'vegan', 'quick'],
      ingredients: [
        { id: crypto.randomUUID(), name: 'Rolled Oats', quantity: 50, unit: 'g', category: 'grain', calories: 194, protein: 8.5, carbs: 33, fat: 3.5, fiber: 5 },
        { id: crypto.randomUUID(), name: 'Almond Milk', quantity: 200, unit: 'ml', category: 'other', calories: 30, protein: 1, carbs: 1, fat: 2.5 },
        { id: crypto.randomUUID(), name: 'Chia Seeds', quantity: 15, unit: 'g', category: 'other', calories: 73, protein: 2.5, carbs: 6, fat: 4.5, fiber: 5 },
      ],
      instructions: ['Combine all ingredients in a jar', 'Stir well', 'Refrigerate overnight', 'Top with fresh fruit before serving'],
    }, userId),
  ]
  for (const r of recipes) recipeRepo.save(r)

  const mealSchedules: MealSchedule[] = [
    { id: crypto.randomUUID(), mealPlanId: '', dayOfWeek: 'monday', mealType: 'breakfast', time: '07:00', foods: [{ id: crypto.randomUUID(), foodId: 'oatmeal', amount: 50, unit: 'g', name: 'Oatmeal with Berries', calories: 300, protein: 10, carbs: 50, fat: 8, fiber: 8, sugar: 15, sodium: 200 }], order: 1 },
    { id: crypto.randomUUID(), mealPlanId: '', dayOfWeek: 'monday', mealType: 'lunch', time: '12:00', foods: [{ id: crypto.randomUUID(), foodId: 'chicken-salad', amount: 150, unit: 'g', name: 'Grilled Chicken Salad', calories: 350, protein: 30, carbs: 20, fat: 15, fiber: 5, sugar: 8, sodium: 300 }], order: 2 },
    { id: crypto.randomUUID(), mealPlanId: '', dayOfWeek: 'monday', mealType: 'dinner', time: '19:00', foods: [{ id: crypto.randomUUID(), foodId: 'salmon', amount: 180, unit: 'g', name: 'Salmon with Vegetables', calories: 400, protein: 35, carbs: 25, fat: 20, fiber: 10, sugar: 5, sodium: 250 }], order: 3 },
    { id: crypto.randomUUID(), mealPlanId: '', dayOfWeek: 'tuesday', mealType: 'breakfast', time: '07:00', foods: [{ id: crypto.randomUUID(), foodId: 'eggs', amount: 2, unit: 'piece', name: 'Scrambled Eggs', calories: 280, protein: 20, carbs: 2, fat: 22, fiber: 0, sugar: 1, sodium: 280 }], order: 1 },
    { id: crypto.randomUUID(), mealPlanId: '', dayOfWeek: 'tuesday', mealType: 'lunch', time: '12:00', foods: [{ id: crypto.randomUUID(), foodId: 'wrap', amount: 1, unit: 'serving', name: 'Chicken Wrap', calories: 450, protein: 35, carbs: 40, fat: 14, fiber: 4, sugar: 3, sodium: 350 }], order: 2 },
    { id: crypto.randomUUID(), mealPlanId: '', dayOfWeek: 'tuesday', mealType: 'dinner', time: '19:00', foods: [{ id: crypto.randomUUID(), foodId: 'stir-fry', amount: 1, unit: 'serving', name: 'Beef Stir Fry', calories: 500, protein: 40, carbs: 35, fat: 18, fiber: 6, sugar: 5, sodium: 400 }], order: 3 },
  ]
  const goals1: NutritionGoals = { targetCalories: 2500, targetProtein: 150, targetCarbs: 300, targetFat: 80, targetFiber: 35, targetWater: 3000 }
  const goals2: NutritionGoals = { targetCalories: 2800, targetProtein: 140, targetCarbs: 350, targetFat: 75, targetFiber: 40, targetWater: 3500 }
  const goals3: NutritionGoals = { targetCalories: 2000, targetProtein: 180, targetCarbs: 200, targetFat: 55, targetFiber: 30, targetWater: 3000 }
  const mealPlans = [
    new MealPlan(crypto.randomUUID(), 'Week 1 - Strength Focus', athleteId, orgId, '2024-01-01', '2024-01-07', goals1, undefined, ['strength', 'bulking'], 'active', mealSchedules),
    new MealPlan(crypto.randomUUID(), 'Week 2 - Endurance', athleteId, orgId, '2024-01-08', '2024-01-14', goals2, undefined, ['endurance', 'cardio'], 'draft'),
    new MealPlan(crypto.randomUUID(), 'Cut Phase - Week 1', athleteId, orgId, '2023-12-01', '2023-12-07', goals3, undefined, ['cutting', 'fat-loss'], 'completed'),
  ]
  for (const mp of mealPlans) mealPlanRepo.save(mp)

  const shoppingListDatas = [
    { name: 'Weekly Groceries', description: 'Main grocery run' },
    { name: 'Post-Workout Meals', description: 'Quick protein-rich snacks' },
    { name: 'Meal Prep Sunday' },
  ]
  const itemDefs = [
    { name: 'Chicken Breast', quantity: 1, unit: 'kg', category: 'protein' as const },
    { name: 'Eggs', quantity: 12, unit: 'pieces', category: 'protein' as const },
    { name: 'Brown Rice', quantity: 1, unit: 'kg', category: 'grains' as const },
    { name: 'Broccoli', quantity: 3, unit: 'pieces', category: 'produce' as const },
    { name: 'Mixed Greens', quantity: 2, unit: 'bags', category: 'produce' as const },
    { name: 'Olive Oil', quantity: 1, unit: 'bottle', category: 'pantry' as const },
  ]
  for (const data of shoppingListDatas) {
    let list = ShoppingList.create({ athleteId, organizationId: orgId, name: data.name, description: data.description })
    itemDefs.forEach((def, i) => {
      const item = ShoppingItem.create({ shoppingListId: list.id, ...def, priority: 'essential' }, list.id)
      list = list.addItem(item)
      if (i % 2 === 0) {
        list = list.markItemPurchased(item.id, true)
      }
    })
    shoppingListRepo.save(list)
  }
}

seed()
