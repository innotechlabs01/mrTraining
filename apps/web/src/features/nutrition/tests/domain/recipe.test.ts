import { Recipe } from '../../domain/recipe';

describe('Recipe', () => {
  it('should create a recipe with valid properties', () => {
    const command = {
      name: 'Protein Pancakes',
      athleteId: 'athlete-123',
      organizationId: 'org-456',
      servings: 2,
      difficulty: 'easy' as const,
      ingredients: [
        {
          id: 'ing-1',
          name: 'Eggs',
          quantity: 3,
          unit: 'pieces',
          category: 'protein' as const,
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
      cookTime: 15
    };

    const recipe = Recipe.create(command, 'test-user-123');

    expect(recipe.id).toBeDefined();
    expect(recipe.name).toBe('Protein Pancakes');
    expect(recipe.servings).toBe(2);
    expect(recipe.difficulty).toBe('easy');
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.calories).toBe(432); // 216 * 2 servings
  });
});