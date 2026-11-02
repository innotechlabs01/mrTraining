import {
  saveSessionResume,
  getSessionResume,
  clearSessionResume,
} from '../executionResume';

describe('executionResume', () => {
  it('saves and reads back a resume position', async () => {
    saveSessionResume('session-1', 2, 1);
    const stored = await getSessionResume();
    expect(stored).toEqual({ sessionId: 'session-1', currentExerciseIndex: 2, currentSetIndex: 1 });
  });

  it('returns null when nothing is saved', async () => {
    await clearSessionResume();
    expect(await getSessionResume()).toBeNull();
  });

  it('clears the saved resume', async () => {
    saveSessionResume('session-2', 1, 0);
    await clearSessionResume();
    expect(await getSessionResume()).toBeNull();
  });
});
