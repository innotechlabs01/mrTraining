import { ShoppingList } from '../../domain/shopping-list';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class ShoppingListApiRepository {
  async save(shoppingList: ShoppingList): Promise<ShoppingList> {
    const res = await fetch('/api/nutrition/shopping-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shoppingList),
    });
    const json: ApiResponse<ShoppingList> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save shopping list');
    return json.data;
  }

  async findById(id: string): Promise<ShoppingList | null> {
    const res = await fetch(`/api/nutrition/shopping-lists?id=${encodeURIComponent(id)}`);
    const json: ApiResponse<ShoppingList | null> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch shopping list');
    return json.data;
  }

  async findByAthlete(athleteId: string): Promise<ShoppingList[]> {
    const res = await fetch(`/api/nutrition/shopping-lists?athleteId=${encodeURIComponent(athleteId)}`);
    const json: ApiResponse<ShoppingList[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch shopping lists');
    return json.data;
  }

  async findByCoach(coachId: string): Promise<ShoppingList[]> {
    const res = await fetch(`/api/nutrition/shopping-lists?coachId=${encodeURIComponent(coachId)}`);
    const json: ApiResponse<ShoppingList[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch shopping lists');
    return json.data;
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/nutrition/shopping-lists?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json: ApiResponse<void> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete shopping list');
  }
}
