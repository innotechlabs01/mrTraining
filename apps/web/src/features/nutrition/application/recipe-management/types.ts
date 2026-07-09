import { RecipeIngredient, RecipeImage, NutritionInfo, AlternativeIngredient, QuantityAdjustment } from '../../domain/recipe';

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

export interface UpdateRecipeCommand {
  id: string;
  organizationId: string;
  name?: string;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  prepTime?: number;
  cookTime?: number;
  instructions?: string[];
  ingredients?: RecipeIngredient[];
  images?: RecipeImage[];
}

export interface GetRecipeCommand {
  id: string;
  organizationId: string;
  athleteId?: string;
}

export interface ApproveRecipeCommand {
  id: string;
  organizationId: string;
  approvedBy: string;
}