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

export interface NutritionGoals {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  targetWater: number;
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

export class MealPlan {
  readonly id: string;
  readonly name: string;
  readonly athleteId: string;
  readonly organizationId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly nutritionGoals: NutritionGoals;
  readonly description?: string;
  readonly tags?: string[];
  readonly status: 'draft' | 'active' | 'completed' | 'archived';
  private readonly _meals: MealSchedule[];

  constructor(
    id: string,
    name: string,
    athleteId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    nutritionGoals: NutritionGoals,
    description?: string,
    tags?: string[],
    status: 'draft' | 'active' | 'completed' | 'archived' = 'draft',
    meals: MealSchedule[] = []
  ) {
    this.id = id;
    this.name = name;
    this.athleteId = athleteId;
    this.organizationId = organizationId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.nutritionGoals = nutritionGoals;
    this.description = description;
    this.tags = tags;
    this.status = status;
    this._meals = meals;
  }

  static create(command: CreateMealPlanCommand, meals?: MealSchedule[]): MealPlan {
    return new MealPlan(
      crypto.randomUUID(),
      command.name,
      command.athleteId,
      command.organizationId,
      command.startDate,
      command.endDate,
      command.nutritionGoals,
      command.description,
      command.tags,
      'draft',
      meals || []
    );
  }

  addMeal(meal: MealSchedule): MealPlan {
    return new MealPlan(
      this.id,
      this.name,
      this.athleteId,
      this.organizationId,
      this.startDate,
      this.endDate,
      this.nutritionGoals,
      this.description,
      this.tags,
      this.status,
      [...this._meals, meal]
    );
  }

  get meals(): MealSchedule[] {
    return this._meals;
  }
}