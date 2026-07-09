export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category:
    | 'protein'
    | 'carbs'
    | 'fat'
    | 'vegetable'
    | 'fruit'
    | 'spice'
    | 'dairy'
    | 'grain'
    | 'other';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface RecipeImage {
  id: string;
  url: string;
  alt: string;
  type: 'ingredient' | 'instruction' | 'finished';
  order: number;
}

export interface CreateRecipeCommand {
  name: string;
  athleteId: string;
  organizationId: string;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  prepTime?: number;
  cookTime?: number;
  instructions: string[];
  ingredients: RecipeIngredient[];
  images?: RecipeImage[];
}

export interface RecipeEnhancement {
  suggestions: string[];
  nutritionalImprovements: Partial<NutritionInfo>;
  alternativeIngredients: AlternativeIngredient[];
  adjustedQuantities: QuantityAdjustment[];
}

export class Recipe {
  readonly id: string;
  readonly name: string;
  readonly athleteId: string;
  readonly organizationId: string;
  readonly servings: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly tags?: string[];
  readonly prepTime?: number;
  readonly cookTime?: number;
  readonly instructions: string[];
  readonly ingredients: RecipeIngredient[];
  readonly images?: RecipeImage[];
  readonly calories?: number;
  readonly protein?: number;
  readonly carbs?: number;
  readonly fat?: number;
  readonly fiber?: number;
  readonly sugar?: number;
  readonly sodium?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  private readonly _suggestions?: string[];

  private constructor(
    id: string,
    name: string,
    athleteId: string,
    organizationId: string,
    servings: number,
    difficulty: 'easy' | 'medium' | 'hard',
    instructions: string[],
    ingredients: RecipeIngredient[],
    createdAt: string,
    updatedAt: string,
    createdBy: string,
    tags?: string[],
    prepTime?: number,
    cookTime?: number,
    images?: RecipeImage[],
    calories?: number,
    protein?: number,
    carbs?: number,
    fat?: number,
    fiber?: number,
    sugar?: number,
    sodium?: number,
    suggestions?: string[]
  ) {
    this.id = id;
    this.name = name;
    this.athleteId = athleteId;
    this.organizationId = organizationId;
    this.servings = servings;
    this.difficulty = difficulty;
    this.tags = tags;
    this.prepTime = prepTime;
    this.cookTime = cookTime;
    this.instructions = instructions;
    this.ingredients = ingredients;
    this.images = images;
    this.calories = calories;
    this.protein = protein;
    this.carbs = carbs;
    this.fat = fat;
    this.fiber = fiber;
    this.sugar = sugar;
    this.sodium = sodium;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this._suggestions = suggestions;

    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Recipe name is required');
    }
    if (this.servings < 1) {
      throw new Error('Recipe must serve at least 1 person');
    }
    if (!this.ingredients || this.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }
    if (!this.instructions || this.instructions.length === 0) {
      throw new Error('Recipe must have at least one instruction');
    }
  }

  static fromProps(props: {
    id: string; name: string; athleteId: string; organizationId: string;
    servings: number; difficulty: 'easy' | 'medium' | 'hard';
    instructions: string[]; ingredients: RecipeIngredient[];
    createdAt: string; updatedAt: string; createdBy: string;
    tags?: string[]; prepTime?: number; cookTime?: number; images?: RecipeImage[];
    calories?: number; protein?: number; carbs?: number; fat?: number;
    fiber?: number; sugar?: number; sodium?: number;
  }): Recipe {
    return new Recipe(
      props.id, props.name, props.athleteId, props.organizationId,
      props.servings, props.difficulty,
      props.instructions, props.ingredients,
      props.createdAt, props.updatedAt, props.createdBy,
      props.tags, props.prepTime, props.cookTime, props.images,
      props.calories, props.protein, props.carbs, props.fat,
      props.fiber, props.sugar, props.sodium
    );
  }

  static create(command: CreateRecipeCommand, createdBy: string): Recipe {
    const nutrition = calculateNutrition(command.ingredients, command.servings);
    const now = new Date().toISOString();

    return new Recipe(
      crypto.randomUUID(),
      command.name,
      command.athleteId,
      command.organizationId,
      command.servings,
      command.difficulty,
      command.instructions,
      command.ingredients,
      now,
      now,
      createdBy,
      command.tags,
      command.prepTime,
      command.cookTime,
      command.images || [],
      nutrition.calories,
      nutrition.protein,
      nutrition.carbs,
      nutrition.fat,
      nutrition.fiber,
      nutrition.sugar,
      nutrition.sodium
    );
  }

  enhanceWithAI(enhancement: RecipeEnhancement): EnhancedRecipe {
    return {
      ...this,
      suggestions: this._suggestions || [],
      enhancedIngredients: this.ingredients.map(ingredient => {
        const alt = enhancement.alternativeIngredients.find(a => a.originalIngredientId === ingredient.id);
        return {
          ...ingredient,
          alternatives: alt ? alt.alternatives : []
        };
      })
    };
  }

  get isApproved(): boolean {
    return this.createdBy === this.organizationId;
  }
}

export interface EnhancedRecipe extends Recipe {
  suggestions: string[];
  enhancedIngredients: RecipeIngredient[];
}

function calculateNutrition(ingredients: RecipeIngredient[], servings: number): NutritionInfo {
  return ingredients.reduce(
    (acc, ingredient) => ({
      calories: acc.calories + ((ingredient.calories || 0) * servings),
      protein: acc.protein + ((ingredient.protein || 0) * servings),
      carbs: acc.carbs + ((ingredient.carbs || 0) * servings),
      fat: acc.fat + ((ingredient.fat || 0) * servings),
      fiber: acc.fiber + ((ingredient.fiber || 0) * servings),
      sugar: acc.sugar + ((ingredient.sugar || 0) * servings),
      sodium: acc.sodium + ((ingredient.sodium || 0) * servings)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface AlternativeIngredient {
  originalIngredientId: string;
  alternatives: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    nutrition: Partial<NutritionInfo>;
    notes?: string;
  }[];
}

export interface QuantityAdjustment {
  ingredientId: string;
  original: number;
  adjusted: number;
  reason: string;
}