import { extractSessionId } from '../sessionStart';

describe('extractSessionId', () => {
  it('reads the id from a top-level session object (Go API contract)', () => {
    expect(extractSessionId({ id: 'sess-1', workoutId: 'w-1', completed: false })).toBe('sess-1');
  });

  it('reads the id from a wrapped { session } shape (legacy contract)', () => {
    expect(extractSessionId({ session: { id: 'sess-2' } })).toBe('sess-2');
  });

  it('throws when the id is missing', () => {
    expect(() => extractSessionId({})).toThrow('Session response missing id');
  });

  it('throws on non-object payloads', () => {
    expect(() => extractSessionId(null)).toThrow('Session response missing id');
    expect(() => extractSessionId('nope')).toThrow('Session response missing id');
  });

  it('throws when the id is not a non-empty string', () => {
    expect(() => extractSessionId({ id: '' })).toThrow('Session response missing id');
    expect(() => extractSessionId({ id: 42 })).toThrow('Session response missing id');
  });
});