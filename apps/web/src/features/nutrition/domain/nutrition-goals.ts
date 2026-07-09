export interface CreateNutritionGoalsCommand {
  athleteId: string;
  organizationId: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  targetWater: number;
  sport?: string;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'intense';
  goalType?: 'maintain' | 'lose' | 'gain' | 'bulking' | 'cutting';
  dietaryRestrictions?: string[];
  allergies?: string[];
  cuisinePreferences?: string[];
  dailyVariability?: number;
}

export interface NutritionGoals {
  id: string;
  athleteId: string;
  organizationId: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  targetWater: number;
  sport?: string;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'intense';
  goalType?: 'maintain' | 'lose' | 'gain' | 'bulking' | 'cutting';
  dietaryRestrictions?: string[];
  allergies?: string[];
  cuisinePreferences?: string[];
  dailyVariability?: number;
  
  // Current state
  currentCalories?: number;
  currentProtein?: number;
  currentCarbs?: number;
  currentFat?: number;
  currentFiber?: number;
  currentWater?: number;
  
  status: 'active' | 'inactive' | 'completed';
  lastUpdated: string;
  updatedBy: string;
}

export interface MacrosPercentage {
  protein: number;
  carbs: number;
  fat: number;
}

export class NutritionGoals {
  readonly id: string;
  readonly athleteId: string;
  readonly organizationId: string;
  readonly targetCalories: number;
  readonly targetProtein: number;
  readonly targetCarbs: number;
  readonly targetFat: number;
  readonly targetFiber: number;
  readonly targetWater: number;
  readonly sport?: string;
  readonly activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'intense';
  readonly goalType?: 'maintain' | 'lose' | 'gain' | 'bulking' | 'cutting';
  readonly dietaryRestrictions?: string[];
  readonly allergies?: string[];
  readonly cuisinePreferences?: string[];
  readonly dailyVariability?: number;
  readonly currentCalories?: number;
  readonly currentProtein?: number;
  readonly currentCarbs?: number;
  readonly currentFat?: number;
  readonly currentFiber?: number;
  readonly currentWater?: number;
  readonly status: 'active' | 'inactive' | 'completed';
  readonly lastUpdated: string;
  readonly updatedBy: string;

  private constructor(
    id: string,
    athleteId: string,
    organizationId: string,
    targetCalories: number,
    targetProtein: number,
    targetCarbs: number,
    targetFat: number,
    targetFiber: number,
    targetWater: number,
    sport?: string,
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'intense',
    goalType?: 'maintain' | 'lose' | 'gain' | 'bulking' | 'cutting',
    dietaryRestrictions?: string[],
    allergies?: string[],
    cuisinePreferences?: string[],
    dailyVariability?: number,
    currentCalories?: number,
    currentProtein?: number,
    currentCarbs?: number,
    currentFat?: number,
    currentFiber?: number,
    currentWater?: number,
    status: 'active' | 'inactive' | 'completed' = 'active',
    lastUpdated?: string,
    updatedBy?: string
  ) {
    this.id = id;
    this.athleteId = athleteId;
    this.organizationId = organizationId;
    this.targetCalories = targetCalories;
    this.targetProtein = targetProtein;
    this.targetCarbs = targetCarbs;
    this.targetFat = targetFat;
    this.targetFiber = targetFiber;
    this.targetWater = targetWater;
    this.sport = sport;
    this.activityLevel = activityLevel;
    this.goalType = goalType;
    this.dietaryRestrictions = dietaryRestrictions;
    this.allergies = allergies;
    this.cuisinePreferences = cuisinePreferences;
    this.dailyVariability = dailyVariability;
    this.currentCalories = currentCalories;
    this.currentProtein = currentProtein;
    this.currentCarbs = currentCarbs;
    this.currentFat = currentFat;
    this.currentFiber = currentFiber;
    this.currentWater = currentWater;
    this.status = status;
    this.lastUpdated = lastUpdated || new Date().toISOString();
    this.updatedBy = updatedBy || athleteId;

    this.validate();
  }

  private validate(): void {
    if (this.targetCalories < 500 || this.targetCalories > 10000) {
      throw new Error('Target calories must be between 500 and 10,000');
    }
    if (this.targetProtein < 20 || this.targetProtein > 500) {
      throw new Error('Target protein must be between 20 and 500 grams');
    }
    if (this.targetCarbs < 20 || this.targetCarbs > 1000) {
      throw new Error('Target carbs must be between 20 and 1,000 grams');
    }
    if (this.targetFat < 10 || this.targetFat > 500) {
      throw new Error('Target fat must be between 10 and 500 grams');
    }
    if (this.targetFiber < 5 || this.targetFiber > 200) {
      throw new Error('Target fiber must be between 5 and 200 grams');
    }
    if (this.targetWater < 1000 || this.targetWater > 10000) {
      throw new Error('Target water must be between 1,000 and 10,000 ml');
    }
  }

  static create(command: CreateNutritionGoalsCommand, updatedBy: string): NutritionGoals {
    const now = new Date().toISOString();

    return new NutritionGoals(
      crypto.randomUUID(),
      command.athleteId,
      command.organizationId,
      command.targetCalories,
      command.targetProtein,
      command.targetCarbs,
      command.targetFat,
      command.targetFiber,
      command.targetWater,
      command.sport,
      command.activityLevel,
      command.goalType,
      command.dietaryRestrictions,
      command.allergies,
      command.cuisinePreferences,
      command.dailyVariability,
      0, // currentCalories
      0, // currentProtein
      0, // currentCarbs
      0, // currentFat
      0, // currentFiber
      0, // currentWater
      'active',
      now,
      updatedBy
    );
  }

  updateCurrentMetrics(
    currentCalories: number,
    currentProtein: number,
    currentCarbs: number,
    currentFat: number,
    currentFiber: number,
    currentWater: number
  ): NutritionGoals {
    return new NutritionGoals(
      this.id,
      this.athleteId,
      this.organizationId,
      this.targetCalories,
      this.targetProtein,
      this.targetCarbs,
      this.targetFat,
      this.targetFiber,
      this.targetWater,
      this.sport,
      this.activityLevel,
      this.goalType,
      this.dietaryRestrictions,
      this.allergies,
      this.cuisinePreferences,
      this.dailyVariability,
      currentCalories,
      currentProtein,
      currentCarbs,
      currentFat,
      currentFiber,
      currentWater,
      this.status,
      new Date().toISOString(),
      this.athleteId
    );
  }

  get macrosPercentage(): MacrosPercentage {
    const totalCalories = this.currentCalories || 0;
    if (totalCalories === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    return {
      protein: Math.round((this.currentProtein || 0) * 4 / totalCalories * 100),
      carbs: Math.round((this.currentCarbs || 0) * 4 / totalCalories * 100),
      fat: Math.round((this.currentFat || 0) * 9 / totalCalories * 100)
    };
  }
}