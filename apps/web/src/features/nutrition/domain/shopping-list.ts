import { ShoppingItem, CreateShoppingItemCommand } from './shopping-item';

export interface ShoppingListProps {
  id: string;
  athleteId: string;
  coachId?: string;
  organizationId: string;
  name: string;
  description?: string;
  mealPlanId?: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoppingListCommand {
  athleteId: string;
  coachId?: string;
  organizationId: string;
  name: string;
  description?: string;
  mealPlanId?: string;
  items?: CreateShoppingItemCommand[];
}

export class ShoppingList {
  readonly id: string;
  readonly athleteId: string;
  readonly coachId?: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description?: string;
  readonly mealPlanId?: string;
  readonly items: ShoppingItem[];
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: ShoppingListProps) {
    this.id = props.id;
    this.athleteId = props.athleteId;
    this.coachId = props.coachId;
    this.organizationId = props.organizationId;
    this.name = props.name;
    this.description = props.description;
    this.mealPlanId = props.mealPlanId;
    this.items = props.items;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    this.validate();
  }

  private validate(): void {
    if (!this.athleteId) {
      throw new Error('Athlete ID is required');
    }
    if (!this.organizationId) {
      throw new Error('Organization ID is required');
    }
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Shopping list name is required');
    }
  }

  static create(
    command: CreateShoppingListCommand,
    createdBy?: string
  ): ShoppingList {
    const now = new Date().toISOString();
    const items = (command.items ?? []).map((item) =>
      ShoppingItem.create(item, '')
    );

    return new ShoppingList({
      id: crypto.randomUUID(),
      athleteId: command.athleteId,
      coachId: command.coachId,
      organizationId: command.organizationId,
      name: command.name,
      description: command.description,
      mealPlanId: command.mealPlanId,
      items,
      createdAt: now,
      updatedAt: now,
    });
  }

  addItem(item: ShoppingItem): ShoppingList {
    return new ShoppingList({
      ...this.toProps(),
      items: [...this.items, item],
      updatedAt: new Date().toISOString(),
    });
  }

  removeItem(itemId: string): ShoppingList {
    return new ShoppingList({
      ...this.toProps(),
      items: this.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
  }

  markItemPurchased(itemId: string, isPurchased: boolean): ShoppingList {
    const items = this.items.map((item) =>
      item.id === itemId
        ? ShoppingItem.fromProps({ ...item.toProps(), isPurchased, updatedAt: new Date().toISOString() })
        : item
    );
    return new ShoppingList({
      ...this.toProps(),
      items,
      updatedAt: new Date().toISOString(),
    });
  }

  get purchasedCount(): number {
    return this.items.filter((item) => item.isPurchased).length;
  }

  get isComplete(): boolean {
    return this.items.length > 0 && this.purchasedCount === this.items.length;
  }

  private toProps(): ShoppingListProps {
    return {
      id: this.id,
      athleteId: this.athleteId,
      coachId: this.coachId,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      mealPlanId: this.mealPlanId,
      items: this.items,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
