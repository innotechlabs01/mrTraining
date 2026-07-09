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

export interface ShoppingItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'other';
  priority: 'essential' | 'optional' | 'extra';
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
  readonly category: 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'other';
  readonly priority: 'essential' | 'optional' | 'extra';
  readonly notes?: string;
  readonly unitPrice?: number;
  readonly estimatedCost?: number;
  readonly isPurchased: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(
    id: string,
    shoppingListId: string,
    name: string,
    quantity: number,
    unit: string,
    category: 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'other',
    priority: 'essential' | 'optional' | 'extra',
    notes?: string,
    unitPrice?: number,
    estimatedCost?: number,
    isPurchased: boolean = false,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.shoppingListId = shoppingListId;
    this.name = name;
    this.quantity = quantity;
    this.unit = unit;
    this.category = category;
    this.priority = priority;
    this.notes = notes;
    this.unitPrice = unitPrice;
    this.estimatedCost = estimatedCost;
    this.isPurchased = isPurchased;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();

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

    return new ShoppingItem(
      crypto.randomUUID(),
      shoppingListId,
      command.name,
      command.quantity,
      command.unit,
      command.category,
      command.priority || 'essential',
      command.notes,
      command.unitPrice,
      estimatedCost,
      false,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }
}
