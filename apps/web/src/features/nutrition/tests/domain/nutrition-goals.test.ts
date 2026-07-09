import { NutritionGoals } from '../../domain/nutrition-goals';

describe('NutritionGoals', () => {
  it('should create nutrition goals with valid properties', () => {
    const goals = NutritionGoals.create({
      athleteId: 'athlete-123',
      organizationId: 'org-456',
      targetCalories: 2500,
      targetProtein: 150,
      targetCarbs: 300,
      targetFat: 80,
      targetFiber: 35,
      targetWater: 3000,
      sport: 'running',
      activityLevel: 'moderate',
      goalType: 'maintain'
    }, 'test-user');

    expect(goals.id).toBeDefined();
    expect(goals.athleteId).toBe('athlete-123');
    expect(goals.organizationId).toBe('org-456');
    expect(goals.targetCalories).toBe(2500);
    expect(goals.status).toBe('active');
    expect(goals.currentCalories).toBe(0);
    expect(goals.sport).toBe('running');
    expect(goals.activityLevel).toBe('moderate');
    expect(goals.goalType).toBe('maintain');
  });
});