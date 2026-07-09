import { InMemoryMealPlanRepository } from '../../infrastructure/repositories/in-memory-meal-plan-repository';
import { InMemoryRecipeRepository } from '../../infrastructure/repositories/in-memory-recipe-repository';
import { InMemoryShoppingListRepository } from '../../infrastructure/repositories/in-memory-shopping-list-repository';
import { MealPlan } from '../../domain/meal-plan';
import { Recipe } from '../../domain/recipe';
import { ShoppingList } from '../../domain/shopping-list';

describe('InMemoryMealPlanRepository', () => {
  let repo: InMemoryMealPlanRepository;

  beforeEach(() => {
    repo = new InMemoryMealPlanRepository();
  });

  it('should save and find a meal plan', async () => {
    const mealPlan = MealPlan.create({
      name: 'Test Plan',
      athleteId: 'athlete-1',
      organizationId: 'org-1',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      nutritionGoals: {
        targetCalories: 2500,
        targetProtein: 150,
        targetCarbs: 300,
        targetFat: 80,
        targetFiber: 35,
        targetWater: 3000,
      },
    });

    await repo.save(mealPlan);
    const found = await repo.findById(mealPlan.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Test Plan');
  });

  it('should find meal plans by athlete', async () => {
    const mp1 = MealPlan.create({ name: 'Plan 1', athleteId: 'a1', organizationId: 'org-1', startDate: '2024-01-01', endDate: '2024-01-07', nutritionGoals: { targetCalories: 2500, targetProtein: 150, targetCarbs: 300, targetFat: 80, targetFiber: 35, targetWater: 3000 } });
    const mp2 = MealPlan.create({ name: 'Plan 2', athleteId: 'a1', organizationId: 'org-1', startDate: '2024-01-08', endDate: '2024-01-14', nutritionGoals: { targetCalories: 2500, targetProtein: 150, targetCarbs: 300, targetFat: 80, targetFiber: 35, targetWater: 3000 } });

    await repo.save(mp1);
    await repo.save(mp2);
    const plans = await repo.findByAthlete('a1');
    expect(plans).toHaveLength(2);
  });

  it('should delete a meal plan', async () => {
    const mp = MealPlan.create({ name: 'Delete Me', athleteId: 'a1', organizationId: 'org-1', startDate: '2024-01-01', endDate: '2024-01-07', nutritionGoals: { targetCalories: 2500, targetProtein: 150, targetCarbs: 300, targetFat: 80, targetFiber: 35, targetWater: 3000 } });
    await repo.save(mp);
    await repo.delete(mp.id);
    const found = await repo.findById(mp.id);
    expect(found).toBeNull();
  });
});

describe('InMemoryRecipeRepository', () => {
  let repo: InMemoryRecipeRepository;

  beforeEach(() => {
    repo = new InMemoryRecipeRepository();
  });

  it('should save and find a recipe', async () => {
    const recipe = Recipe.create({
      name: 'Pasta',
      athleteId: 'a1',
      organizationId: 'org-1',
      servings: 2,
      difficulty: 'easy',
      instructions: ['Boil water', 'Cook pasta'],
      ingredients: [{ id: 'ing-1', name: 'Pasta', quantity: 200, unit: 'g', category: 'grain' }],
    }, 'a1');

    await repo.save(recipe);
    const found = await repo.findById(recipe.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Pasta');
  });

  it('should find recipes by athlete', async () => {
    const r1 = Recipe.create({ name: 'Recipe 1', athleteId: 'a1', organizationId: 'org-1', servings: 2, difficulty: 'easy', instructions: ['Step 1'], ingredients: [{ id: 'i1', name: 'Test', quantity: 1, unit: 'cup', category: 'other' }] }, 'a1');
    const r2 = Recipe.create({ name: 'Recipe 2', athleteId: 'a1', organizationId: 'org-1', servings: 4, difficulty: 'medium', instructions: ['Step A'], ingredients: [{ id: 'i2', name: 'Item', quantity: 2, unit: 'tbsp', category: 'other' }] }, 'a1');

    await repo.save(r1);
    await repo.save(r2);
    const recipes = await repo.findByAthlete('a1');
    expect(recipes).toHaveLength(2);
  });

  it('should return null for non-existent recipe', async () => {
    const found = await repo.findById('non-existent');
    expect(found).toBeNull();
  });
});

describe('InMemoryShoppingListRepository', () => {
  let repo: InMemoryShoppingListRepository;

  beforeEach(() => {
    repo = new InMemoryShoppingListRepository();
  });

  it('should save and find a shopping list', async () => {
    const sl = ShoppingList.create({
      athleteId: 'a1',
      coachId: 'c1',
      organizationId: 'org-1',
      name: 'Weekly Groceries',
    });

    await repo.save(sl);
    const found = await repo.findById(sl.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Weekly Groceries');
  });

  it('should find shopping lists by coach', async () => {
    const sl1 = ShoppingList.create({ athleteId: 'a1', coachId: 'c1', organizationId: 'org-1', name: 'List 1' });
    const sl2 = ShoppingList.create({ athleteId: 'a2', coachId: 'c1', organizationId: 'org-1', name: 'List 2' });

    await repo.save(sl1);
    await repo.save(sl2);
    const lists = await repo.findByCoach('c1');
    expect(lists).toHaveLength(2);
  });
});
