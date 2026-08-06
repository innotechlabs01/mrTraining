import { MealPlan } from '../../domain/meal-plan';

export interface MealPlanRepository {
  save(mealPlan: MealPlan): Promise<MealPlan>;
}

export interface NutritionCalculator {
  calculateGoals(goals: NutritionGoals): Promise<CalculatedNutrition>;
  calculateMealNutrition(items: FoodPortion[]): Promise<NutritionMetrics>;
}

export interface NotificationService {
  notify(mealPlan: MealPlan): Promise<void>;
}

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
  sport?: string;
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

export interface MealSchedule {
  id: string;
  mealPlanId: string;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post-workout';
  time?: string;
  foods: FoodPortion[];
  notes?: string;
  order: number;
}

export interface CreateMealPlanCommand {
  name: string;
  athleteId: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  nutritionGoals: NutritionGoals;
  description?: string;
  tags?: string[];
}