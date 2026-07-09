import { MealPlan } from '../../domain/meal-plan';
import { CreateMealPlanCommand } from './types';

interface MealPlanRepository {
  save(mealPlan: MealPlan): Promise<MealPlan>;
}

interface NutritionCalculator {
  calculateGoals(goals: NutritionGoals): Promise<CalculatedNutrition>;
  calculateMealNutrition(items: FoodPortion[]): Promise<NutritionMetrics>;
}

interface NotificationService {
  notifyMealPlanCreated(mealPlan: MealPlan): Promise<void>;
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

export class CreateMealPlanUseCase {
  constructor(
    private mealPlanRepository: MealPlanRepository,
    private nutritionCalculator: NutritionCalculator,
    private notificationService: NotificationService
  ) {}

  async execute(command: CreateMealPlanCommand): Promise<MealPlan> {
    this.validateCommand(command);
    
    const nutritionGoals = await this.calculateGoals(command);
    
    const mealSchedule = await this.generateMealSchedule(command, nutritionGoals);
    
    const mealPlan = MealPlan.create({
      ...command,
      nutritionGoals,
    }, mealSchedule);
    
    const saved = await this.mealPlanRepository.save(mealPlan);
    
    await this.notificationService.notifyMealPlanCreated(saved);
    
    return saved;
  }

  private validateCommand(command: CreateMealPlanCommand): void {
    if (!command.name || command.name.trim().length === 0) {
      throw new Error('Meal plan name is required');
    }
    if (!command.athleteId || command.athleteId.trim().length === 0) {
      throw new Error('Athlete ID is required');
    }
    if (!command.organizationId || command.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }
    if (new Date(command.startDate) >= new Date(command.endDate)) {
      throw new Error('Start date must be before end date');
    }
    if (!command.nutritionGoals) {
      throw new Error('Nutrition goals are required');
    }
  }

  private async calculateGoals(command: CreateMealPlanCommand): Promise<NutritionGoals> {
    const calculated = await this.nutritionCalculator.calculateGoals(command.nutritionGoals);
    
    return {
      ...command.nutritionGoals,
      activityLevel: command.nutritionGoals.activityLevel || 'moderate',
      goalType: command.nutritionGoals.goalType || 'maintain',
      currentCalories: 0,
      currentProtein: 0,
      currentCarbs: 0,
      currentFat: 0,
      currentFiber: 0,
      currentWater: 0
    };
  }

  private async generateMealSchedule(
    command: CreateMealPlanCommand,
    nutritionGoals: NutritionGoals
  ): Promise<MealSchedule[]> {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealsPerDay = 3;
    
    return daysOfWeek.slice(0, this.getWeekDayCount(command.startDate, command.endDate)).map((day, dayIndex) => {
      const mealTypeVariations: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
      
      return mealTypeVariations.map((mealType, mealIndex) => ({
        id: `${day}-${mealType}-${dayIndex}-${mealIndex}`,
        mealPlanId: '',
        dayOfWeek: day as any,
        mealType,
        time: this.getDefaultMealTime(mealType, day),
        foods: this.generateSampleFoods(mealType, nutritionGoals),
        notes: this.generateMealNotes(mealType, nutritionGoals),
        order: mealIndex + 1
      }));
    }).flat();
  }

  private getWeekDayCount(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  private getDefaultMealTime(mealType: string, day: string): string {
    const defaultTimes: Record<string, string> = {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '19:00'
    };
    return defaultTimes[mealType] || '12:00';
  }

  private generateSampleFoods(mealType: string, goals: NutritionGoals): FoodPortion[] {
    const sampleFoods: Record<string, FoodPortion[]> = {
      breakfast: [
        {
          id: 'food-breakfast-1',
          foodId: 'oatmeal',
          amount: 50,
          unit: 'g',
          name: 'Oatmeal with Berries',
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 8,
          fiber: 8,
          sugar: 15,
          sodium: 200
        }
      ],
      lunch: [
        {
          id: 'food-lunch-1',
          foodId: 'grilled-chicken-salad',
          amount: 150,
          unit: 'g',
          name: 'Grilled Chicken Salad',
          calories: 350,
          protein: 30,
          carbs: 20,
          fat: 15,
          fiber: 5,
          sugar: 8,
          sodium: 300
        }
      ],
      dinner: [
        {
          id: 'food-dinner-1',
          foodId: 'salmon-with-vegetables',
          amount: 180,
          unit: 'g',
          name: 'Salmon with Vegetables',
          calories: 400,
          protein: 35,
          carbs: 25,
          fat: 20,
          fiber: 10,
          sugar: 5,
          sodium: 250
        }
      ]
    };

    return sampleFoods[mealType] || [];
  }

  private generateMealNotes(mealType: string, goals: NutritionGoals): string {
    const notes = [];
    if (goals.sport) {
      notes.push(`Optimized for ${goals.sport} performance`);
    }
    if (goals.goalType) {
      notes.push(`Supports ${goals.goalType} goals`);
    }
    if (goals.activityLevel === 'active' || goals.activityLevel === 'intense') {
      notes.push('Higher calorie intake for intense activity');
    }
    return notes.join('. ') || 'Balance macronutrients throughout the day';
  }
}