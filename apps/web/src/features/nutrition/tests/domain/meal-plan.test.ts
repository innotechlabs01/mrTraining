import { MealPlan } from '../../domain/meal-plan';

describe('MealPlan', () => {
  it('should create a meal plan with valid properties', () => {
    const mealPlan = MealPlan.create({
      name: 'Week 1 Plan',
      athleteId: 'athlete-123',
      organizationId: 'org-456',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      nutritionGoals: {
        targetCalories: 2500,
        targetProtein: 150,
        targetCarbs: 300,
        targetFat: 80,
        targetFiber: 35,
        targetWater: 3000
      }
    });

    expect(mealPlan.id).toBeDefined();
    expect(mealPlan.name).toBe('Week 1 Plan');
    expect(mealPlan.athleteId).toBe('athlete-123');
    expect(mealPlan.nutritionGoals.targetCalories).toBe(2500);
    expect(mealPlan.status).toBe('draft');
    expect(mealPlan.meals).toEqual([]);
  });
});