import { shouldUseAiFor } from '../aiWorkoutTrigger';

describe('shouldUseAiFor', () => {
  it('false for exercises without an AI definition', () => {
    expect(shouldUseAiFor({ mode: 'cardio', name: 'Run' })).toBe(false);
  });
  it('true for a known squat', () => {
    expect(shouldUseAiFor({ mode: 'reps', name: 'Squat' })).toBe(true);
  });
});
