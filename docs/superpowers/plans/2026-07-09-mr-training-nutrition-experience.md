# MR Training Nutrition Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing basic NutritionTracker component into a comprehensive nutrition platform with meal planning, macro calculation, recipe management, shopping lists, notifications, and AI suggestions following MR Training's Clean Architecture patterns.

**Architecture:** Feature-First organization with Server Components by default, using TanStack Query for server state, Zustand for UI state. Each feature module contains domain models, application use cases, and shared components. Clean Architecture with clear dependency rules.

**Tech Stack:** Next.js 14+, React 18+, TypeScript 5.x, Tailwind CSS 3.4+, shadcn/ui, TanStack Query 5.x, Zustand 4.x, Framer Motion 10+, zod, Clerk auth, PostgreSQL via API layer

---

# Task 4: Shopping Item Domain Model

**Files:**
- Create: `apps/web/src/features/nutrition/domain/shopping-item.ts`
- Create: `apps/web/src/features/nutrition/tests/domain/shopping-item.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { ShoppingItem } from '../../domain/shopping-item';
import { ShoppingList } from '../../domain/shopping-list';

describe('ShoppingItem', () => {
  it('should create a shopping item with valid properties', () => {
    const item = ShoppingItem.create({
      shoppingListId: 'list-123',
      name: 'Chicken Breast',
      quantity: 2,
      unit: 'kg',
      category: 'protein',
      priority: 'essential',
      notes: 'Fresh, organic'
    });

    expect(item.id).toBeDefined();
    expect(item.shoppingListId).toBe('list-123');
    expect(item.name).toBe('Chicken Breast');
    expect(item.quantity).toBe(2);
    expect(item.unit).toBe('kg');
    expect(item.category).toBe('protein');
    expect(item.priority).toBe('essential');
    expect(item.isPurchased).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @mrtraining/web test apps/web/src/features/nutrition/tests/domain/shopping-item.test.ts -v
Expected: FAIL with "ShoppingItem is not defined"
```

**Step 3: Write minimal implementation**

```typescript
export interface ShoppingList {
  id: string;
  athleteId: string;
  coachId: string;
  organizationId: string;
  name: string;
  description?: string;
  mealPlanId?: string;
  items: ShoppingItem[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  sharedWith?: string[];
  createdAt: string;
  updatedAt: string;
  deadline?: string;
}

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

export class ShoppingList {
  readonly id: string;
  readonly athleteId: string;
  readonly coachId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description?: string;
  readonly mealPlanId?: string;
  readonly items: ShoppingItem[];
  readonly status: 'draft' | 'active' | 'completed' | 'archived';
  readonly sharedWith?: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deadline?: string;

  private constructor(
    id: string,
    athleteId: string,
    coachId: string,
    organizationId: string,
    name: string,
    description?: string,
    mealPlanId?: string,
    items: ShoppingItem[] = [],
    status: 'draft' | 'active' | 'completed' | 'archived' = 'draft',
    sharedWith?: string[],
    createdAt?: string,
    updatedAt?: string,
    deadline?: string
  ) {
    this.id = id;
    this.athleteId = athleteId;
    this.coachId = coachId;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.mealPlanId = mealPlanId;
    this.items = items;
    this.status = status;
    this.sharedWith = sharedWith;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
    this.deadline = deadline;

    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Shopping list name is required');
    }
    if (this.items.some(item => !item.name || item.name.trim().length === 0)) {
      throw new Error('All shopping items must have names');
    }
  }

  static create(command: CreateShoppingListCommand, createdBy: string): ShoppingList {
    const items = command.items?.map(item => ShoppingItem.create({
      shoppingListId: '', // Will be set after list creation
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      priority: item.priority || 'essential',
      notes: item.notes,
      unitPrice: item.unitPrice,
      estimatedCost: item.estimatedCost
    })) || [];

    return new ShoppingList(
      crypto.randomUUID(),
      command.athleteId,
      command.coachId,
      command.organizationId,
      command.name,
      command.description,
      command.mealPlanId,
      items,
      'draft',
      new Date().toISOString(),
      new Date().toISOString(),
      command.deadline
    );
  }

  addItem(item: CreateShoppingItemCommand): ShoppingList {
    const shoppingItem = ShoppingItem.create({
      shoppingListId: this.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      priority: item.priority || 'essential',
      notes: item.notes,
      unitPrice: item.unitPrice,
      estimatedCost: item.estimatedCost
    });

    return new ShoppingList(
      this.id,
      this.athleteId,
      this.coachId,
      this.organizationId,
      this.name,
      this.description,
      this.mealPlanId,
      [...this.items, shoppingItem],
      this.status,
      this.createdAt,
      new Date().toISOString(),
      this.deadline
    );
  }

  markItemPurchased(itemId: string): ShoppingList {
    const updatedItems = this.items.map(item =>
      item.id === itemId
        ? { ...item, isPurchased: true, updatedAt: new Date().toISOString() }
        : item
    );

    return new ShoppingList(
      this.id,
      this.athleteId,
      this.coachId,
      this.organizationId,
      this.name,
      this.description,
      this.mealPlanId,
      updatedItems,
      this.status,
      this.createdAt,
      new Date().toISOString(),
      this.deadline
    );
  }

  removeItem(itemId: string): ShoppingList {
    const filteredItems = this.items.filter(item => item.id !== itemId);

    return new ShoppingList(
      this.id,
      this.athleteId,
      this.coachId,
      this.organizationId,
      this.name,
      this.description,
      this.mealPlanId,
      filteredItems,
      this.status,
      this.createdAt,
      new Date().toISOString(),
      this.deadline
    );
  }
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

export interface CreateShoppingListCommand {
  athleteId: string;
  coachId?: string;
  organizationId: string;
  name: string;
  description?: string;
  mealPlanId?: string;
  items?: CreateShoppingItemCommand[];
  sharedWith?: string[];
  deadline?: string;
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @mrtraining/web test apps/web/src/features/nutrition/tests/domain/shopping-item.test.ts -v
Expected: All tests pass
```

**Step 5: Commit**

```bash
git add apps/web/src/features/nutrition/domain/shopping-item.ts
git add apps/web/src/features/nutrition/tests/domain/shopping-item.test.ts
git commit -m "feat: add shopping item domain model"
```

## Selected Context for This Task

**Task 4: Shopping Item Domain Model** - Creating the shopping list domain models that power grocery management, meal plan integration, and shopping workflows

**Scene Setting:** This task creates the core models for tracking and managing grocery lists. Shopping lists are the bridge between meal planning and actual grocery purchases - they translate recipes and meal plans into actionable shopping items with quantities, categories, and purchase status.

**Key Dependencies:**
- Will be imported by shopping list use cases
- Will be displayed in shopping list UI components
- Integrates with meal planning for automatic list generation
- Connects with nutrition tracking for dietary compliance

**Business Rules:**
- Shopping lists can be shared between athletes and coaches
- Items can be marked as purchased to track completion
- Lists can be created from meal plans automatically
- Categories help with organization and filtering
- Priority levels help manage shopping effort and budget

**Integration Points:**
- API layer will serve shopping lists for athlete consumption
- UI shopping components display and manage lists
- Automatic generation from recipes and meal plans
- Integration with meal planning for coordinated shopping

**Files Created:**
- Domain model: `apps/web/src/features/nutrition/domain/shopping-item.ts`
- Tests: `apps/web/src/features/nutrition/tests/domain/shopping-item.test.ts`

**Files Modified:**
- `apps/web/src/features/nutrition/components/shopping-list/ShoppingListDashboard.tsx` (enhanced to use shopping item models)
- `apps/web/src/features/nutrition/components/meal-planner/MealPlanner.tsx` (integrated shopping list functionality)