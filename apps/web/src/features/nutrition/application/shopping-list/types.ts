import type { ShoppingItem, ShoppingItemCategory, ShoppingItemPriority } from '../../domain/shopping-item';
import type { MealPlan } from '../../domain/meal-plan';

export interface CreateShoppingListCommand {
  athleteId: string;
  coachId?: string;
  organizationId: string;
  name: string;
  description?: string;
  mealPlanId?: string;
}

export interface AddItemCommand {
  shoppingListId: string;
  athleteId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingItemCategory;
  priority?: ShoppingItemPriority;
  notes?: string;
  unitPrice?: number;
  estimatedCost?: number;
}

export interface MarkItemPurchasedCommand {
  shoppingListId: string;
  athleteId: string;
  itemId: string;
  isPurchased: boolean;
}

export interface RemoveItemCommand {
  shoppingListId: string;
  athleteId: string;
  itemId: string;
}

export interface GenerateFromMealPlanCommand {
  athleteId: string;
  coachId?: string;
  organizationId: string;
  mealPlanId: string;
  name?: string;
  description?: string;
  includeOrganizationItems?: boolean;
}

export interface ShoppingListRepository {
  save(shoppingList: import('../../domain/shopping-list').ShoppingList): Promise<import('../../domain/shopping-list').ShoppingList>;
  findById(id: string): Promise<import('../../domain/shopping-list').ShoppingList | null>;
  findByAthlete(athleteId: string): Promise<import('../../domain/shopping-list').ShoppingList[]>;
  findByCoach(coachId: string): Promise<import('../../domain/shopping-list').ShoppingList[]>;
  delete(id: string): Promise<void>;
}

export interface MealPlanRepository {
  findById(id: string, athleteId: string): Promise<MealPlan | null>;
  findByAthlete(athleteId: string): Promise<MealPlan[]>;
}

export interface NotificationService {
  notifyShoppingListCreated(shoppingList: import('../../domain/shopping-list').ShoppingList): Promise<void>;
  notifyShoppingListUpdated(shoppingList: import('../../domain/shopping-list').ShoppingList): Promise<void>;
  notifyShoppingListDeleted(shoppingListId: string): Promise<void>;
}

export type { ShoppingItem, ShoppingItemCategory, ShoppingItemPriority };
