import {
  startSession,
  trackPlay,
  trackPause,
  trackProgress,
  endSession,
  getCurrentSession,
} from '../videoAnalytics';

// Mock apiClient
jest.mock('../../../../infrastructure/api/client', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({}),
  },
}));

describe('videoAnalytics', () => {
  beforeEach(() => {
    endSession();
  });

  it('starts a session with exerciseId', () => {
    const id = startSession('ex-1');
    expect(id).toMatch(/^vid_/);
    expect(getCurrentSession()?.exerciseId).toBe('ex-1');
  });

  it('records play event', () => {
    startSession('ex-1');
    trackPlay('ex-1', 0, 60);
    const session = getCurrentSession();
    expect(session?.events).toHaveLength(1);
    expect(session?.events[0].type).toBe('play');
  });

  it('records pause event', () => {
    startSession('ex-1');
    trackPause('ex-1', 30, 60);
    const session = getCurrentSession();
    expect(session?.events).toHaveLength(1);
    expect(session?.events[0].type).toBe('pause');
  });

  it('reports progress milestones at 25%, 50%, 75%', () => {
    startSession('ex-1');
    trackProgress('ex-1', 15, 60); // 25%
    trackProgress('ex-1', 30, 60); // 50%
    trackProgress('ex-1', 45, 60); // 75%
    const session = getCurrentSession();
    const progressEvents = session?.events.filter((e) => e.type === 'progress');
    expect(progressEvents).toHaveLength(3);
  });

  it('reports completion at 100%', () => {
    startSession('ex-1');
    trackProgress('ex-1', 60, 60); // 100%
    const session = getCurrentSession();
    const completeEvents = session?.events.filter((e) => e.type === 'complete');
    expect(completeEvents).toHaveLength(1);
  });

  it('does not duplicate milestone reports', () => {
    startSession('ex-1');
    trackProgress('ex-1', 15, 60);
    trackProgress('ex-1', 16, 60);
    trackProgress('ex-1', 17, 60);
    const session = getCurrentSession();
    const progressEvents = session?.events.filter((e) => e.type === 'progress');
    expect(progressEvents).toHaveLength(1);
  });

  it('ends session and returns it', () => {
    startSession('ex-1');
    trackPlay('ex-1', 0, 60);
    const ended = endSession();
    expect(ended?.events).toHaveLength(1);
    expect(getCurrentSession()).toBeNull();
  });

  it('does nothing if no session active', () => {
    trackPlay('ex-1', 0, 60);
    trackPause('ex-1', 30, 60);
    expect(getCurrentSession()).toBeNull();
  });
});
