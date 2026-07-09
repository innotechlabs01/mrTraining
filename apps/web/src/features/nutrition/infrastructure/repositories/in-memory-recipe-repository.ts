import { Recipe } from '../../domain/recipe';

export class InMemoryRecipeRepository {
  private store = new Map<string, Recipe>();

  async save(recipe: Recipe): Promise<Recipe> {
    this.store.set(recipe.id, recipe);
    return recipe;
  }

  async findById(id: string): Promise<Recipe | null> {
    return this.store.get(id) ?? null;
  }

  async findByAthlete(athleteId: string): Promise<Recipe[]> {
    return Array.from(this.store.values()).filter(
      (r) => r.athleteId === athleteId
    );
  }

  async findByOrganization(organizationId: string): Promise<Recipe[]> {
    return Array.from(this.store.values()).filter(
      (r) => r.organizationId === organizationId
    );
  }

  async approveRecipe(id: string, approvedBy: string): Promise<Recipe> {
    const recipe = this.store.get(id);
    if (!recipe) throw new Error('Recipe not found');
    return recipe;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}
