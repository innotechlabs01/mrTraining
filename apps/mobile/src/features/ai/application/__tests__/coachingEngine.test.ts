import { CoachingEngine } from '../CoachingEngine';

describe('CoachingEngine', () => {
  it('speaks a high-priority event immediately', () => {
    const c = new CoachingEngine();
    expect(c.shouldSpeak({ message: 'Listo', priority: 3, minCooldownMs: 1000 }, 0)).toBe(true);
  });
  it('suppresses a repeated low-priority message within cooldown', () => {
    const c = new CoachingEngine();
    c.shouldSpeak({ message: 'Bien', priority: 1, minCooldownMs: 2000 }, 0);
    c.lastSpokenAt(0);
    expect(c.shouldSpeak({ message: 'Bien', priority: 1, minCooldownMs: 2000 }, 500)).toBe(false);
    expect(c.shouldSpeak({ message: 'Bien', priority: 1, minCooldownMs: 2000 }, 2500)).toBe(true);
  });
  it('offers varied positive messages', () => {
    const msgs = CoachingEngine.positiveMessages();
    expect(msgs.length).toBeGreaterThan(2);
    expect(new Set(msgs).size).toBe(msgs.length);
  });
});
