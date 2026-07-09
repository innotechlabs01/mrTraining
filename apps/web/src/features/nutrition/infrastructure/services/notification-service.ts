export class ConsoleNotificationService {
  async notifyMealPlanCreated(mealPlan: { id: string; name: string }): Promise<void> {
    if (typeof console !== 'undefined') {
      console.log(`[Nutrition] Meal plan created: ${mealPlan.name} (${mealPlan.id})`);
    }
  }

  async notifyShoppingListCreated(shoppingList: { id: string; name: string }): Promise<void> {
    if (typeof console !== 'undefined') {
      console.log(`[Nutrition] Shopping list created: ${shoppingList.name} (${shoppingList.id})`);
    }
  }

  async notifyShoppingListUpdated(shoppingList: { id: string; name: string }): Promise<void> {
    if (typeof console !== 'undefined') {
      console.log(`[Nutrition] Shopping list updated: ${shoppingList.name} (${shoppingList.id})`);
    }
  }

  async notifyShoppingListDeleted(shoppingListId: string): Promise<void> {
    if (typeof console !== 'undefined') {
      console.log(`[Nutrition] Shopping list deleted: ${shoppingListId}`);
    }
  }

  async notify(mealPlan: { id: string; name: string }): Promise<void> {
    return this.notifyMealPlanCreated(mealPlan);
  }
}

export class ToastNotificationService {
  private showToast(message: string, type: 'success' | 'info' | 'error'): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const event = new CustomEvent('nutrition:toast', {
        detail: { message, type },
      });
      window.dispatchEvent(event);
    }
  }

  async notifyMealPlanCreated(mealPlan: { id: string; name: string }): Promise<void> {
    this.showToast(`Meal plan "${mealPlan.name}" created successfully`, 'success');
  }

  async notifyShoppingListCreated(shoppingList: { id: string; name: string }): Promise<void> {
    this.showToast(`Shopping list "${shoppingList.name}" created`, 'success');
  }

  async notifyShoppingListUpdated(shoppingList: { id: string; name: string }): Promise<void> {
    this.showToast(`Shopping list "${shoppingList.name}" updated`, 'info');
  }

  async notifyShoppingListDeleted(shoppingListId: string): Promise<void> {
    this.showToast(`Shopping list deleted`, 'info');
  }

  async notify(mealPlan: { id: string; name: string }): Promise<void> {
    return this.notifyMealPlanCreated(mealPlan);
  }
}
