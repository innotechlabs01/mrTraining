"use strict";

jest.setTimeout(10000);

import { CreateRecipeUseCase } from '../../application/recipe-management/use-cases';
import { CreateRecipeCommand } from '../../application/recipe-management/types';
import { Recipe } from '../../domain/recipe';

const mockRecipeRepository = {
  save: jest.fn().mockImplementation((recipe) => Promise.resolve(recipe)),
  findById: jest.fn().mockReturnValue(Promise.resolve(null)),
  findByAthlete: jest.fn().mockReturnValue(Promise.resolve([])),
  findByOrganization: jest.fn().mockReturnValue(Promise.resolve([])),
  approveRecipe: jest.fn().mockReturnValue(Promise.resolve()),
  delete: jest.fn().mockReturnValue(Promise.resolve())
};

const mockNutritionCalculator = {
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

const mockAIEnhancementService = {
  enhanceRecipe: jest.fn().mockReturnValue(Promise.resolve({
    suggestions: ['Try adding spinach for extra iron'],
    nutritionalImprovements: { calories: 450 },
    alternativeIngredients: [],
    adjustedQuantities: []
  }))
};

describe('CreateRecipeUseCase', () => {
  it('should create a recipe with valid properties', async () => {
    const useCase = new CreateRecipeUseCase(
      mockRecipeRepository,
      mockNutritionCalculator,
      mockAIEnhancementService
    );

    const command: CreateRecipeCommand = {
      name: 'Protein Pancakes',
      athleteId: 'athlete-123',
      organizationId: 'org-456',
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        {
          id: 'ing-1',
          name: 'Eggs',
          quantity: 3,
          unit: 'pieces',
          category: 'protein',
          calories: 216,
          protein: 12,
          carbs: 1,
          fat: 15,
          fiber: 0,
          sugar: 0.5,
          sodium: 140
        }
      ],
      instructions: ['Mix ingredients', 'Cook on skillet', 'Serve'],
      prepTime: 10,
      cookTime: 15,
      images: []
    };

    const result = await useCase.execute(command);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Protein Pancakes');
    expect(result.servings).toBe(2);
    expect(result.difficulty).toBe('easy');
    expect(mockRecipeRepository.save).toHaveBeenCalledWith(expect.any(Recipe));
    expect(mockNutritionCalculator.calculateRecipeNutrition).toHaveBeenCalledWith(
      command.ingredients,
      command.servings
    );
    expect(mockAIEnhancementService.enhanceRecipe).toHaveBeenCalled();
  });
});
