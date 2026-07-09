export interface CreateShoppingItemCommand {
  shoppingListId: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'other';
  priority?: 'essential' | 'optional' | 'extra';
  notes?: string;
  unitPrice?: number;
  estimatedCost?: number;
}

export type ShoppingItemCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'grains'
  | 'pantry'
  | 'frozen'
  | 'beverages'
  | 'snacks'
  | 'other';

export type ShoppingItemPriority = 'essential' | 'optional' | 'extra';

export interface ShoppingItemProps {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingItemCategory;
  priority: ShoppingItemPriority;
  notes?: string;
  unitPrice?: number;
  estimatedCost?: number;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ShoppingItem {
  readonly id: string;
  readonly shoppingListId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unit: string;
  readonly category: ShoppingItemCategory;
  readonly priority: ShoppingItemPriority;
  readonly notes?: string;
  readonly unitPrice?: number;
  readonly estimatedCost?: number;
  readonly isPurchased: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: ShoppingItemProps) {
    this.id = props.id;
    this.shoppingListId = props.shoppingListId;
    this.name = props.name;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.category = props.category;
    this.priority = props.priority;
    this.notes = props.notes;
    this.unitPrice = props.unitPrice;
    this.estimatedCost = props.estimatedCost;
    this.isPurchased = props.isPurchased;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Shopping item name is required');
    }
    if (this.quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    if (!this.unit || this.unit.trim().length === 0) {
      throw new Error('Unit is required');
    }
  }

  static create(command: CreateShoppingItemCommand, shoppingListId: string): ShoppingItem {
    const estimatedCost = command.unitPrice ? command.unitPrice * command.quantity : undefined;
    const now = new Date().toISOString();

    return new ShoppingItem({
      id: crypto.randomUUID(),
      shoppingListId,
      name: command.name,
      quantity: command.quantity,
      unit: command.unit,
      category: command.category,
      priority: command.priority || 'essential',
      notes: command.notes,
      unitPrice: command.unitPrice,
      estimatedCost,
      isPurchased: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: ShoppingItemProps): ShoppingItem {
    return new ShoppingItem(props);
  }

  toProps(): ShoppingItemProps {
    return {
      id: this.id,
      shoppingListId: this.shoppingListId,
      name: this.name,
      quantity: this.quantity,
      unit: this.unit,
      category: this.category,
      priority: this.priority,
      notes: this.notes,
      unitPrice: this.unitPrice,
      estimatedCost: this.estimatedCost,
      isPurchased: this.isPurchased,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
