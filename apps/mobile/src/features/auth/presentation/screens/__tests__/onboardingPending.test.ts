import { savePendingOnboarding, getPendingOnboarding, clearPendingOnboarding } from '../onboardingPending';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      removeItem: jest.fn(async (k: string) => { delete store[k]; }),
    },
  };
});

const payload = {
  sports: ['gym'],
  modality: 'in-person',
  experienceLevel: 'beginner',
  goal: 'strength',
  sessionsPerWeek: 4,
  sessionDuration: 60,
  equipment: 'full-gym',
  athleteRoutineAccepted: true,
};

describe('onboardingPending', () => {
  it('saves and reads back a payload', async () => {
    savePendingOnboarding(payload);
    const stored = await getPendingOnboarding();
    expect(stored).toEqual(payload);
  });

  it('returns null when nothing saved', async () => {
    await clearPendingOnboarding();
    expect(await getPendingOnboarding()).toBeNull();
  });

  it('clears the buffer', async () => {
    savePendingOnboarding(payload);
    await clearPendingOnboarding();
    expect(await getPendingOnboarding()).toBeNull();
  });
});
