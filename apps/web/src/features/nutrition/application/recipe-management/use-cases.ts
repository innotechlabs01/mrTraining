import { Recipe } from '../../domain/recipe';
import { CreateRecipeCommand, UpdateRecipeCommand, GetRecipeCommand, ApproveRecipeCommand } from './types';
import { NutritionInfo } from '../../domain/recipe';

interface RecipeRepository {
  save(recipe: Recipe): Promise<Recipe>;
  findById(id: string, organizationId: string): Promise<Recipe | null>;
  findByAthlete(athleteId: string): Promise<Recipe[]>;
  findByOrganization(organizationId: string): Promise<Recipe[]>;
  approveRecipe(id: string, approvedBy: string): Promise<Recipe>;
  delete(id: string): Promise<void>;
}

interface NutritionCalculator {
  calculateRecipeNutrition(ingredients: any[], servings: number): Promise<NutritionInfo>;
}

interface AIEnhancementService {
  enhanceRecipe(recipe: Partial<Recipe>): Promise<any>;
}

export class CreateRecipeUseCase {
  constructor(
    private recipeRepository: RecipeRepository,
    private nutritionCalculator: NutritionCalculator,
    private aiEnhancementService: AIEnhancementService
  ) {}

  async execute(command: CreateRecipeCommand): Promise<Recipe> {
    this.validateCommand(command);
    
    const nutrition = await this.nutritionCalculator.calculateRecipeNutrition(
      command.ingredients,
      command.servings
    );
    
    const enhancement = await this.aiEnhancementService.enhanceRecipe({
      id: '',
      name: command.name,
      athleteId: command.athleteId,
      organizationId: command.organizationId,
      servings: command.servings,
      difficulty: command.difficulty,
      tags: command.tags || [],
      prepTime: command.prepTime,
      cookTime: command.cookTime,
      instructions: command.instructions,
      ingredients: command.ingredients,
      images: command.images || [],
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      sodium: nutrition.sodium,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: command.athleteId
    });
    
    const recipe = Recipe.create({
      name: command.name,
      athleteId: command.athleteId,
      organizationId: command.organizationId,
      servings: command.servings,
      difficulty: command.difficulty,
      tags: command.tags,
      prepTime: command.prepTime,
      cookTime: command.cookTime,
      instructions: command.instructions,
      ingredients: command.ingredients,
      images: command.images || []
    }, command.athleteId);
    
    const saved = await this.recipeRepository.save(recipe);
    
    return saved;
  }

  private validateCommand(command: CreateRecipeCommand): void {
    if (!command.name || command.name.trim().length === 0) {
      throw new Error('Recipe name is required');
    }
    if (!command.athleteId) {
      throw new Error('Athlete ID is required');
    }
    if (!command.organizationId) {
      throw new Error('Organization ID is required');
    }
    if (!command.servings || command.servings < 1) {
      throw new Error('Recipe must serve at least 1 person');
    }
    if (!command.ingredients || command.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }
    if (!command.instructions || command.instructions.length === 0) {
      throw new Error('Recipe must have at least one instruction');
    }
  }
}

export class UpdateRecipeUseCase {
  constructor(
    private recipeRepository: RecipeRepository,
    private nutritionCalculator: NutritionCalculator,
    private aiEnhancementService: AIEnhancementService
  ) {}

  async execute(command: UpdateRecipeCommand): Promise<Recipe> {
    const existing = await this.recipeRepository.findById(command.id, command.organizationId);
    if (!existing) {
      throw new Error('Recipe not found');
    }
    
    if (existing.organizationId !== command.organizationId) {
      throw new Error('Not authorized to update this recipe');
    }
    
    const updatedIngredients = command.ingredients 
      ? command.ingredients 
      : existing.ingredients;
    const updatedInstructions = command.instructions 
      ? command.instructions 
      : existing.instructions;
    
    let calculatedCalories = existing.calories;
    let calculatedProtein = existing.protein;
    let calculatedCarbs = existing.carbs;
    let calculatedFat = existing.fat;
    let calculatedFiber = existing.fiber;
    let calculatedSugar = existing.sugar;
    let calculatedSodium = existing.sodium;

    if (command.ingredients) {
      const calculated = await this.nutritionCalculator.calculateRecipeNutrition(
        updatedIngredients,
        existing.servings
      );
      calculatedCalories = calculated.calories;
      calculatedProtein = calculated.protein;
      calculatedCarbs = calculated.carbs;
      calculatedFat = calculated.fat;
      calculatedFiber = calculated.fiber;
      calculatedSugar = calculated.sugar;
      calculatedSodium = calculated.sodium;
    }
    
    const updated = Recipe.fromProps({
      id: existing.id,
      name: command.name || existing.name,
      athleteId: existing.athleteId,
      organizationId: existing.organizationId,
      servings: command.servings || existing.servings,
      difficulty: command.difficulty || existing.difficulty,
      tags: command.tags || existing.tags,
      prepTime: command.prepTime !== undefined ? command.prepTime : existing.prepTime,
      cookTime: command.cookTime !== undefined ? command.cookTime : existing.cookTime,
      instructions: updatedInstructions,
      ingredients: updatedIngredients,
      images: command.images || existing.images,
      calories: calculatedCalories,
      protein: calculatedProtein,
      carbs: calculatedCarbs,
      fat: calculatedFat,
      fiber: calculatedFiber,
      sugar: calculatedSugar,
      sodium: calculatedSodium,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      createdBy: existing.createdBy
    });
    
    const saved = await this.recipeRepository.save(updated);
    
    return saved;
  }
}

export class GetRecipeUseCase {
  constructor(private recipeRepository: RecipeRepository) {}

  async execute(command: GetRecipeCommand): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(command.id, command.organizationId);
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    if (recipe.organizationId !== command.organizationId && recipe.athleteId !== command.athleteId) {
      throw new Error('Not authorized to access this recipe');
    }
    
    return recipe;
  }

  async executeList(athleteId?: string, organizationId: string = 'default'): Promise<Recipe[]> {
    let recipes: Recipe[];
    
    if (athleteId) {
      recipes = await this.recipeRepository.findByAthlete(athleteId);
    } else {
      recipes = await this.recipeRepository.findByOrganization(organizationId);
    }
    
    if (!athleteId) {
      recipes = recipes.filter(recipe => recipe.isApproved);
    }
    
    return recipes;
  }
}

export class ApproveRecipeUseCase {
  constructor(private recipeRepository: RecipeRepository) {}

  async execute(command: ApproveRecipeCommand): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(command.id, command.organizationId);
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    if (recipe.organizationId !== command.organizationId) {
      throw new Error('Not authorized to approve this recipe');
    }
    
    return await this.recipeRepository.approveRecipe(command.id, command.approvedBy);
  }
}

export const mockRecipeRepository = {
  save: jest.fn().mockImplementation((recipe: Recipe) => Promise.resolve(recipe)),
  findById: jest.fn().mockReturnValue(Promise.resolve(null)),
  findByAthlete: jest.fn().mockReturnValue(Promise.resolve([])),
  findByOrganization: jest.fn().mockReturnValue(Promise.resolve([])),
  approveRecipe: jest.fn().mockReturnValue(Promise.resolve()),
  delete: jest.fn().mockReturnValue(Promise.resolve())
};

export const mockNutritionCalculator = {
  calculateRecipeNutrition: jest.fn().mockReturnValue(Promise.resolve({
    calories: 400,
    protein: 20,
    carbs: 30,
    fat: 15,
    fiber: 5,
    sugar: 5,
    sodium: 300
  }))
};

export const mockAIEnhancementService = {
  enhanceRecipe: jest.fn().mockReturnValue(Promise.resolve({
    suggestions: ['Try adding spinach for extra iron'],
    nutritionalImprovements: { calories: 450 },
    alternativeIngredients: [],
    adjustedQuantities: []
  }))
};