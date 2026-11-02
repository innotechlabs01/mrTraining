import { savePendingOnboarding, getPendingOnboarding, clearPendingOnboarding } from '../onboardingPending';

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
