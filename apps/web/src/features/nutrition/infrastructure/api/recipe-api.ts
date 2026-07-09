import { Recipe } from '../../domain/recipe';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class RecipeApiRepository {
  async save(recipe: Recipe): Promise<Recipe> {
    const res = await fetch('/api/nutrition/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    const json: ApiResponse<Recipe> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save recipe');
    return json.data;
  }

  async findById(id: string, organizationId: string): Promise<Recipe | null> {
    const res = await fetch(`/api/nutrition/recipes?id=${encodeURIComponent(id)}&organizationId=${encodeURIComponent(organizationId)}`);
    const json: ApiResponse<Recipe | null> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch recipe');
    return json.data;
  }

  async findByAthlete(athleteId: string): Promise<Recipe[]> {
    const res = await fetch(`/api/nutrition/recipes?athleteId=${encodeURIComponent(athleteId)}`);
    const json: ApiResponse<Recipe[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch recipes');
    return json.data;
  }

  async findByOrganization(organizationId: string): Promise<Recipe[]> {
    const res = await fetch(`/api/nutrition/recipes?organizationId=${encodeURIComponent(organizationId)}`);
    const json: ApiResponse<Recipe[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch recipes');
    return json.data;
  }

  async approveRecipe(id: string, approvedBy: string): Promise<Recipe> {
    const res = await fetch(`/api/nutrition/recipes/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approvedBy }),
    });
    const json: ApiResponse<Recipe> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to approve recipe');
    return json.data;
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/nutrition/recipes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json: ApiResponse<void> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete recipe');
  }
}
