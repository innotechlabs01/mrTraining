export interface NutritionGoals {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  targetWater: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'intense';
  goalType?: 'lose' | 'maintain' | 'gain';
  currentCalories?: number;
  currentProtein?: number;
  currentCarbs?: number;
  currentFat?: number;
  currentFiber?: number;
  currentWater?: number;
}

export interface CalculatedNutrition {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  targetWater: number;
  adjustments?: string[];
}

export interface NutritionMetrics {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface FoodPortion {
  id: string;
  foodId: string;
  amount: number;
  unit: 'g' | 'ml' | 'piece' | 'serving';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  intense: 1.9,
};

const GOAL_ADJUSTMENTS: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
  lose: { calories: -500, protein: 1.8, carbs: 2.0, fat: 0.8 },
  maintain: { calories: 0, protein: 1.6, carbs: 3.0, fat: 1.0 },
  gain: { calories: 500, protein: 2.0, carbs: 4.0, fat: 1.2 },
};

export class NutritionCalculator {
  async calculateGoals(goals: NutritionGoals): Promise<CalculatedNutrition> {
    const activityLevel = goals.activityLevel || 'moderate';
    const goalType = goals.goalType || 'maintain';

    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    const adjustments = GOAL_ADJUSTMENTS[goalType] || GOAL_ADJUSTMENTS.maintain;

    const bmr = 10 * (goals.currentCalories ? goals.currentCalories / 24 : 1800 / 24) + 6.25 * 175 - 5 * 30 + 5;
    const tdee = Math.round(bmr * multiplier);

    const targetCalories = goals.targetCalories || tdee + adjustments.calories;
    const targetProtein = goals.targetProtein || Math.round((adjustments.protein * targetCalories) / 4);
    const targetCarbs = goals.targetCarbs || Math.round((adjustments.carbs * targetCalories) / 4);
    const targetFat = goals.targetFat || Math.round((adjustments.fat * targetCalories) / 9);

    const adjustmentMessages: string[] = [];
    if (goalType !== 'maintain') {
      adjustmentMessages.push(`Calories adjusted for ${goalType} goal (${adjustments.calories > 0 ? '+' : ''}${adjustments.calories} kcal)`);
    }
    if (activityLevel !== 'moderate') {
      adjustmentMessages.push(`Activity multiplier applied: ${multiplier}x (${activityLevel})`);
    }

    return {
      targetCalories: Math.max(targetCalories, 1200),
      targetProtein: Math.max(targetProtein, 50),
      targetCarbs: Math.max(targetCarbs, 100),
      targetFat: Math.max(targetFat, 30),
      targetFiber: goals.targetFiber || Math.round(targetCalories / 1000 * 14),
      targetWater: goals.targetWater || Math.round(targetCalories / 1000 * 1000),
      adjustments: adjustmentMessages.length > 0 ? adjustmentMessages : undefined,
    };
  }

  async calculateMealNutrition(items: FoodPortion[]): Promise<NutritionMetrics> {
    return items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
        sugar: acc.sugar + item.sugar,
        sodium: acc.sodium + item.sodium,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
    );
  }

  async calculateRecipeNutrition(
    ingredients: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number; sugar?: number; sodium?: number }[],
    servings: number
  ): Promise<NutritionMetrics> {
    const initial: NutritionMetrics = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    return ingredients.reduce<NutritionMetrics>(
      (acc, ing) => ({
        calories: (acc.calories) + ((ing.calories || 0) * servings),
        protein: (acc.protein) + ((ing.protein || 0) * servings),
        carbs: (acc.carbs) + ((ing.carbs || 0) * servings),
        fat: (acc.fat) + ((ing.fat || 0) * servings),
        fiber: (acc.fiber) + ((ing.fiber || 0) * servings),
        sugar: (acc.sugar) + ((ing.sugar || 0) * servings),
        sodium: (acc.sodium) + ((ing.sodium || 0) * servings),
      }),
      initial
    );
  }
}
