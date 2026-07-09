import { ShoppingList } from '../../domain/shopping-list';
import { ShoppingItem, CreateShoppingItemCommand } from '../../domain/shopping-item';
import { MealPlan } from '../../domain/meal-plan';
import type {
  CreateShoppingListCommand,
  AddItemCommand,
  MarkItemPurchasedCommand,
  RemoveItemCommand,
  GenerateFromMealPlanCommand,
  ShoppingListRepository,
  MealPlanRepository,
  NotificationService,
} from './types';

export class CreateShoppingListUseCase {
  constructor(
    private shoppingListRepository: ShoppingListRepository,
    private mealPlanRepository: MealPlanRepository,
    private notificationService: NotificationService
  ) {}

  async execute(command: CreateShoppingListCommand): Promise<ShoppingList> {
    this.validateCommand(command);

    const shoppingList = ShoppingList.create({
      athleteId: command.athleteId,
      coachId: command.coachId,
      organizationId: command.organizationId,
      name: command.name,
      description: command.description,
      mealPlanId: command.mealPlanId,
    });

    const saved = await this.shoppingListRepository.save(shoppingList);
    await this.notificationService.notifyShoppingListCreated(saved);
    return saved;
  }

  private validateCommand(command: CreateShoppingListCommand): void {
    if (!command.athleteId) throw new Error('Athlete ID is required');
    if (!command.organizationId) throw new Error('Organization ID is required');
    if (!command.name || command.name.trim().length === 0) {
      throw new Error('Shopping list name is required');
    }
  }
}

export class AddItemUseCase {
  constructor(
    private shoppingListRepository: ShoppingListRepository,
    private notificationService: NotificationService
  ) {}

  async execute(command: AddItemCommand): Promise<ShoppingList> {
    const shoppingList = await this.shoppingListRepository.findById(command.shoppingListId);
    if (!shoppingList) throw new Error('Shopping list not found');

    this.assertCanModify(shoppingList, command.athleteId);

    const item = ShoppingItem.create(
      command as CreateShoppingItemCommand,
      command.shoppingListId
    );
    const updated = shoppingList.addItem(item);
    const saved = await this.shoppingListRepository.save(updated);
    await this.notificationService.notifyShoppingListUpdated(saved);
    return saved;
  }

  private assertCanModify(list: ShoppingList, athleteId: string): void {
    if (list.athleteId !== athleteId && list.coachId !== athleteId) {
      throw new Error('Not authorized to modify this shopping list');
    }
  }
}

export class MarkItemPurchasedUseCase {
  constructor(
    private shoppingListRepository: ShoppingListRepository,
    private notificationService: NotificationService
  ) {}

  async execute(command: MarkItemPurchasedCommand): Promise<ShoppingList> {
    const shoppingList = await this.shoppingListRepository.findById(command.shoppingListId);
    if (!shoppingList) throw new Error('Shopping list not found');

    if (shoppingList.athleteId !== command.athleteId && shoppingList.coachId !== command.athleteId) {
      throw new Error('Not authorized to modify this shopping list');
    }

    const updated = shoppingList.markItemPurchased(command.itemId, command.isPurchased);
    const saved = await this.shoppingListRepository.save(updated);
    await this.notificationService.notifyShoppingListUpdated(saved);
    return saved;
  }
}

export class RemoveItemUseCase {
  constructor(
    private shoppingListRepository: ShoppingListRepository,
    private notificationService: NotificationService
  ) {}

  async execute(command: RemoveItemCommand): Promise<ShoppingList> {
    const shoppingList = await this.shoppingListRepository.findById(command.shoppingListId);
    if (!shoppingList) throw new Error('Shopping list not found');

    if (shoppingList.athleteId !== command.athleteId && shoppingList.coachId !== command.athleteId) {
      throw new Error('Not authorized to modify this shopping list');
    }

    const updated = shoppingList.removeItem(command.itemId);
    const saved = await this.shoppingListRepository.save(updated);
    await this.notificationService.notifyShoppingListUpdated(saved);
    return saved;
  }
}

export class GenerateFromMealPlanUseCase {
  constructor(
    private shoppingListRepository: ShoppingListRepository,
    private mealPlanRepository: MealPlanRepository,
    private notificationService: NotificationService
  ) {}

  async execute(command: GenerateFromMealPlanCommand): Promise<ShoppingList> {
    const mealPlan = await this.mealPlanRepository.findById(command.mealPlanId, command.athleteId);
    if (!mealPlan) throw new Error('Meal plan not found');

    if (mealPlan.athleteId !== command.athleteId && mealPlan.organizationId !== command.athleteId) {
      throw new Error('Not authorized to access this meal plan');
    }

    const items = this.extractItemsFromMealPlan(mealPlan);

    const shoppingList = ShoppingList.create({
      athleteId: command.athleteId,
      coachId: command.coachId,
      organizationId: command.organizationId,
      name: command.name || `Shopping List for ${mealPlan.name}`,
      description: command.description || `Generated from meal plan: ${mealPlan.name}`,
      mealPlanId: command.mealPlanId,
      items,
    });

    const saved = await this.shoppingListRepository.save(shoppingList);
    await this.notificationService.notifyShoppingListCreated(saved);
    return saved;
  }

  private extractItemsFromMealPlan(mealPlan: MealPlan): CreateShoppingItemCommand[] {
    const consolidated = new Map<string, CreateShoppingItemCommand>();

    for (const meal of mealPlan.meals) {
      for (const food of meal.foods) {
        const key = food.name.toLowerCase();
        const existing = consolidated.get(key);
        if (existing) {
          existing.quantity += food.amount;
        } else {
          consolidated.set(key, {
            shoppingListId: '',
            name: food.name,
            quantity: food.amount,
            unit: food.unit,
            category: this.categorize(food.name),
            priority: this.prioritize(food.name, food.calories),
            notes: `From ${meal.mealType} in ${mealPlan.name}`,
          });
        }
      }
    }

    return Array.from(consolidated.values());
  }

  private categorize(name: string): CreateShoppingItemCommand['category'] {
    const n = name.toLowerCase();
    if (/(chicken|beef|fish|turkey|salmon|pork)/.test(n)) return 'protein';
    if (/(milk|yogurt|cheese)/.test(n)) return 'dairy';
    if (/(bread|pasta|rice|oat|grain)/.test(n)) return 'grains';
    if (/(apple|banana|berry|vegetable|spinach|broccoli|lettuce)/.test(n)) return 'produce';
    if (/(oil|spice|sauce|salt|pepper)/.test(n)) return 'pantry';
    if (/(juice|soda|water|drink)/.test(n)) return 'beverages';
    if (/(snack|candy|cookie|chip)/.test(n)) return 'snacks';
    if (/frozen/.test(n)) return 'frozen';
    return 'other';
  }

  private prioritize(name: string, calories: number): CreateShoppingItemCommand['priority'] {
    if (calories > 400) return 'essential';
    if (/healthy|organic|lean/.test(name.toLowerCase())) return 'essential';
    return 'optional';
  }
}
