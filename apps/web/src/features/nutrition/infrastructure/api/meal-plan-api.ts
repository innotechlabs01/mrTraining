import { MealPlan } from '../../domain/meal-plan';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class MealPlanApiRepository {
  async save(mealPlan: MealPlan): Promise<MealPlan> {
    const res = await fetch('/api/nutrition/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealPlan),
    });
    const json: ApiResponse<MealPlan> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save meal plan');
    return json.data;
  }

  async findById(id: string): Promise<MealPlan | null> {
    const res = await fetch(`/api/nutrition/meal-plans?id=${encodeURIComponent(id)}`);
    const json: ApiResponse<MealPlan | null> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch meal plan');
    return json.data;
  }

  async findByAthlete(athleteId: string): Promise<MealPlan[]> {
    const res = await fetch(`/api/nutrition/meal-plans?athleteId=${encodeURIComponent(athleteId)}`);
    const json: ApiResponse<MealPlan[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch meal plans');
    return json.data;
  }

  async findByOrganization(organizationId: string): Promise<MealPlan[]> {
    const res = await fetch(`/api/nutrition/meal-plans?organizationId=${encodeURIComponent(organizationId)}`);
    const json: ApiResponse<MealPlan[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch meal plans');
    return json.data;
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/nutrition/meal-plans?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json: ApiResponse<void> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete meal plan');
  }
}
