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
    }, 'list-123');

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
