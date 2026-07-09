import { NutritionCalculator } from '../../infrastructure/services/nutrition-calculator';

describe('NutritionCalculator', () => {
  let calculator: NutritionCalculator;

  beforeEach(() => {
    calculator = new NutritionCalculator();
  });

  describe('calculateGoals', () => {
    it('should calculate goals with minimum required fields', async () => {
      const result = await calculator.calculateGoals({
        targetCalories: 2500,
        targetProtein: 150,
        targetCarbs: 300,
        targetFat: 80,
        targetFiber: 35,
        targetWater: 3000,
      });

      expect(result.targetCalories).toBe(2500);
      expect(result.targetProtein).toBe(150);
      expect(result.targetCarbs).toBe(300);
      expect(result.targetFat).toBe(80);
      expect(result.targetFiber).toBe(35);
      expect(result.targetWater).toBe(3000);
    });

    it('should enforce minimum values', async () => {
      const result = await calculator.calculateGoals({
        targetCalories: 500,
        targetProtein: 10,
        targetCarbs: 20,
        targetFat: 5,
        targetFiber: 0,
        targetWater: 0,
      });

      expect(result.targetCalories).toBe(1200);
      expect(result.targetProtein).toBe(50);
      expect(result.targetCarbs).toBe(100);
      expect(result.targetFat).toBe(30);
    });

    it('should adjust for activity level', async () => {
      const sedentary = await calculator.calculateGoals({
        targetCalories: 2000, targetProtein: 100, targetCarbs: 200, targetFat: 60, targetFiber: 25, targetWater: 2000,
        activityLevel: 'sedentary',
      });

      const active = await calculator.calculateGoals({
        targetCalories: 2000, targetProtein: 100, targetCarbs: 200, targetFat: 60, targetFiber: 25, targetWater: 2000,
        activityLevel: 'active',
      });

      expect(sedentary.adjustments?.some(a => a.includes('sedentary'))).toBe(true);
      expect(active.adjustments?.some(a => a.includes('active'))).toBe(true);
    });

    it('should adjust for goal type', async () => {
      const result = await calculator.calculateGoals({
        targetCalories: 2000, targetProtein: 100, targetCarbs: 200, targetFat: 60, targetFiber: 25, targetWater: 2000,
        goalType: 'lose',
      });

      expect(result.adjustments?.some(a => a.includes('lose'))).toBe(true);
    });
  });

  describe('calculateMealNutrition', () => {
    it('should sum nutrition for food items', async () => {
      const result = await calculator.calculateMealNutrition([
        { id: '1', foodId: 'f1', amount: 100, unit: 'g', name: 'Chicken', calories: 200, protein: 30, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 100 },
        { id: '2', foodId: 'f2', amount: 150, unit: 'g', name: 'Rice', calories: 200, protein: 5, carbs: 45, fat: 1, fiber: 1, sugar: 0, sodium: 5 },
      ]);

      expect(result.calories).toBe(400);
      expect(result.protein).toBe(35);
      expect(result.carbs).toBe(45);
      expect(result.fat).toBe(9);
    });
  });

  describe('calculateRecipeNutrition', () => {
    it('should calculate nutrition per serving', async () => {
      const result = await calculator.calculateRecipeNutrition([
        { calories: 200, protein: 20, carbs: 10, fat: 5, fiber: 2, sugar: 1, sodium: 100 },
        { calories: 100, protein: 5, carbs: 20, fat: 3, fiber: 1, sugar: 2, sodium: 50 },
      ], 2);

      expect(result.calories).toBe(600);
      expect(result.protein).toBe(50);
      expect(result.sodium).toBe(300);
    });
  });
});
