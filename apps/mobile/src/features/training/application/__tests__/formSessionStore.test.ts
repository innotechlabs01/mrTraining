import {
  takeFormSessionResult,
  useFormSessionStore,
  type FormSessionResult,
} from '../formSessionStore';

const RESULT: FormSessionResult = {
  exerciseId: 'ex-1',
  score: 92,
  quality: 'GOOD',
  metrics: { depth: 90, alignment: 88, tempo: 70 },
};

describe('formSessionStore', () => {
  beforeEach(() => {
    useFormSessionStore.getState().clear();
  });

  it('stores and exposes the last result', () => {
    useFormSessionStore.getState().setResult(RESULT);
    expect(useFormSessionStore.getState().lastResult).toEqual(RESULT);
  });

  it('takeFormSessionResult returns and clears a matching result', () => {
    useFormSessionStore.getState().setResult(RESULT);
    expect(takeFormSessionResult('ex-1')).toEqual(RESULT);
    expect(useFormSessionStore.getState().lastResult).toBeNull();
  });

  it('takeFormSessionResult keeps a result for another exercise', () => {
    useFormSessionStore.getState().setResult(RESULT);
    expect(takeFormSessionResult('ex-2')).toBeNull();
    expect(useFormSessionStore.getState().lastResult).toEqual(RESULT);
  });

  it('takeFormSessionResult returns null when empty', () => {
    expect(takeFormSessionResult('ex-1')).toBeNull();
  });

  it('clear empties the store', () => {
    useFormSessionStore.getState().setResult(RESULT);
    useFormSessionStore.getState().clear();
    expect(useFormSessionStore.getState().lastResult).toBeNull();
  });
});
