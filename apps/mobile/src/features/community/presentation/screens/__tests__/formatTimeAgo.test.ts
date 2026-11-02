import { formatTimeAgo } from '../DiscussionForumScreen';

describe('formatTimeAgo', () => {
  it('returns "ahora mismo" for timestamps less than a minute old', () => {
    expect(formatTimeAgo(new Date(Date.now() - 20 * 1000).toISOString())).toBe('ahora mismo');
  });

  it('returns minutes in Spanish', () => {
    expect(formatTimeAgo(new Date(Date.now() - 5 * 60 * 1000).toISOString())).toBe('hace 5 min');
  });

  it('returns hours in Spanish', () => {
    expect(formatTimeAgo(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())).toBe('hace 3 h');
  });

  it('returns days in Spanish', () => {
    expect(formatTimeAgo(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())).toBe('hace 2 d');
  });
});
