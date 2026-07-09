import { CreateMealPlanUseCase } from '../../application/meal-planning/use-cases';
import { MealPlan } from '../../domain/meal-plan';

const mockMealPlanRepository = {
  save: jest.fn().mockImplementation((mealPlan) => Promise.resolve(mealPlan))
};

const mockNutritionCalculator = {
  calculateGoals: jest.fn(),
  calculateMealNutrition: jest.fn()
};

const mockNotificationService = {
  notifyMealPlanCreated: jest.fn()
};

describe('CreateMealPlanUseCase', () => {
  it('should create a meal plan with valid data', async () => {
    const useCase = new CreateMealPlanUseCase(
      mockMealPlanRepository,
      mockNutritionCalculator,
      mockNotificationService
    );

    const command = {
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
    };

    mockNutritionCalculator.calculateGoals.mockResolvedValue({
      targetCalories: 2500,
      targetProtein: 150,
      targetCarbs: 300,
      targetFat: 80,
      targetFiber: 35,
      targetWater: 3000,
      adjustments: []
    });

    const result = await useCase.execute(command);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Week 1 Plan');
    expect(result.athleteId).toBe('athlete-123');
    expect(mockNutritionCalculator.calculateGoals).toHaveBeenCalled();
    expect(mockNotificationService.notifyMealPlanCreated).toHaveBeenCalled();
  });
});