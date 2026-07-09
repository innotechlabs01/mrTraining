import { CreateShoppingListUseCase, AddItemUseCase, MarkItemPurchasedUseCase } from '../../application/shopping-list/use-cases';
import { ShoppingList } from '../../domain/shopping-list';
import { ShoppingItem } from '../../domain/shopping-item';

const mockShoppingListRepository = {
  save: jest.fn().mockImplementation((shoppingList) => Promise.resolve(shoppingList)),
  findById: jest.fn().mockReturnValue(Promise.resolve(null)),
  findByAthlete: jest.fn().mockReturnValue(Promise.resolve([])),
  findByCoach: jest.fn().mockReturnValue(Promise.resolve([])),
  delete: jest.fn().mockReturnValue(Promise.resolve())
};

const mockMealPlanRepository = {
  findById: jest.fn().mockReturnValue(Promise.resolve(null)),
  findByAthlete: jest.fn().mockReturnValue(Promise.resolve([]))
};

const mockNotificationService = {
  notifyShoppingListCreated: jest.fn(),
  notifyShoppingListUpdated: jest.fn(),
  notifyShoppingListDeleted: jest.fn()
};

const mockNutritionCalculator = {
  calculateRecipeNutrition: jest.fn().mockReturnValue(Promise.resolve({})),
  calculateMealNutrition: jest.fn().mockReturnValue(Promise.resolve({}))
};

const mockAIEnhancementService = {
  enhanceRecipe: jest.fn().mockReturnValue(Promise.resolve({}))
};

describe('CreateShoppingListUseCase', () => {
  let useCase: CreateShoppingListUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateShoppingListUseCase(
      mockShoppingListRepository,
      mockMealPlanRepository,
      mockNotificationService
    );
  });

  it('should create a shopping list with valid properties', async () => {
    const command: any = {
      athleteId: 'athlete-123',
      coachId: 'coach-456',
      organizationId: 'org-789',
      name: 'Weekly Groceries',
      description: 'Grocery list for the week'
    };

    const result = await useCase.execute(command);

    expect(result.id).toBeDefined();
    expect(result.athleteId).toBe('athlete-123');
    expect(result.coachId).toBe('coach-456');
    expect(result.name).toBe('Weekly Groceries');
    expect(mockShoppingListRepository.save).toHaveBeenCalled();
    expect(mockNotificationService.notifyShoppingListCreated).toHaveBeenCalled();
  });

  it('should throw error when required properties are missing', async () => {
    const command: any = {
      athleteId: '',
      coachId: 'coach-456',
      organizationId: 'org-789',
      name: 'Weekly Groceries'
    };

    await expect(useCase.execute(command)).rejects.toThrow('Athlete ID is required');
  });
});

describe('AddItemUseCase', () => {
  let useCase: AddItemUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AddItemUseCase(
      mockShoppingListRepository,
      mockNotificationService
    );
  });

  it('should add an item to shopping list when user has permission', async () => {
    const shoppingList = ShoppingList.create({
      athleteId: 'athlete-123',
      coachId: 'coach-456',
      organizationId: 'org-789',
      name: 'Weekly Groceries'
    });

    const command = {
      shoppingListId: shoppingList.id,
      athleteId: 'athlete-123',
      name: 'Chicken Breast',
      quantity: 2,
      unit: 'lbs',
      category: 'protein' as const
    };

    mockShoppingListRepository.findById.mockResolvedValue(shoppingList);
    mockShoppingListRepository.save.mockImplementation((list) => Promise.resolve(list));

    const result = await useCase.execute(command);

    expect(mockShoppingListRepository.findById).toHaveBeenCalledWith(shoppingList.id);
    expect(mockShoppingListRepository.save).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
  });

  it('should throw error when user does not have permission to modify shopping list', async () => {
    const shoppingList = ShoppingList.create({
      athleteId: 'athlete-123',
      coachId: 'coach-456',
      organizationId: 'org-789',
      name: 'Weekly Groceries'
    });

    const command = {
      shoppingListId: shoppingList.id,
      athleteId: 'athlete-999',
      name: 'Chicken Breast',
      quantity: 2,
      unit: 'lbs',
      category: 'protein' as const
    };

    mockShoppingListRepository.findById.mockResolvedValue(shoppingList);

    await expect(useCase.execute(command)).rejects.toThrow('Not authorized to modify this shopping list');
  });
});

describe('MarkItemPurchasedUseCase', () => {
  let useCase: MarkItemPurchasedUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MarkItemPurchasedUseCase(
      mockShoppingListRepository,
      mockNotificationService
    );
  });

  it('should mark item as purchased when user has permission', async () => {
    const item = ShoppingItem.create({
      shoppingListId: '',
      name: 'Chicken Breast',
      quantity: 2,
      unit: 'lbs',
      category: 'protein'
    }, 'list-123');

    const shoppingList = ShoppingList.create({
      athleteId: 'athlete-123',
      coachId: 'coach-456',
      organizationId: 'org-789',
      name: 'Weekly Groceries',
      items: [{
        shoppingListId: 'list-123',
        name: 'Chicken Breast',
        quantity: 2,
        unit: 'lbs',
        category: 'protein',
        notes: item.notes
      }]
    });

    const command = {
      shoppingListId: shoppingList.id,
      athleteId: 'athlete-123',
      itemId: shoppingList.items[0].id,
      isPurchased: true
    };

    mockShoppingListRepository.findById.mockResolvedValue(shoppingList);
    mockShoppingListRepository.save.mockImplementation((list) => Promise.resolve(list));

    const result = await useCase.execute(command);

    expect(mockShoppingListRepository.findById).toHaveBeenCalledWith(shoppingList.id);
    expect(mockShoppingListRepository.save).toHaveBeenCalled();
    expect(result.items[0].isPurchased).toBe(true);
  });
});