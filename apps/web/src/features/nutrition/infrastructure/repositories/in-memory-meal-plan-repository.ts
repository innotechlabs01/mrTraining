import { MealPlan } from '../../domain/meal-plan';

export class InMemoryMealPlanRepository {
  private store = new Map<string, MealPlan>();

  async save(mealPlan: MealPlan): Promise<MealPlan> {
    this.store.set(mealPlan.id, mealPlan);
    return mealPlan;
  }

  async findById(id: string): Promise<MealPlan | null> {
    return this.store.get(id) ?? null;
  }

  async findByAthlete(athleteId: string): Promise<MealPlan[]> {
    return Array.from(this.store.values()).filter(
      (mp) => mp.athleteId === athleteId
    );
  }

  async findByOrganization(organizationId: string): Promise<MealPlan[]> {
    return Array.from(this.store.values()).filter(
      (mp) => mp.organizationId === organizationId
    );
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}
