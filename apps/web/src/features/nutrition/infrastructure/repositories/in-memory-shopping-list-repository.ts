import { ShoppingList } from '../../domain/shopping-list';

export class InMemoryShoppingListRepository {
  private store = new Map<string, ShoppingList>();

  async save(shoppingList: ShoppingList): Promise<ShoppingList> {
    this.store.set(shoppingList.id, shoppingList);
    return shoppingList;
  }

  async findById(id: string): Promise<ShoppingList | null> {
    return this.store.get(id) ?? null;
  }

  async findByAthlete(athleteId: string): Promise<ShoppingList[]> {
    return Array.from(this.store.values()).filter(
      (sl) => sl.athleteId === athleteId
    );
  }

  async findByCoach(coachId: string): Promise<ShoppingList[]> {
    return Array.from(this.store.values()).filter(
      (sl) => sl.coachId === coachId
    );
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}
