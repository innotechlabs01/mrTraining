import type { Query } from '@tanstack/react-query';

import { shouldDehydrateQuery } from '../queryCachePersister';

function makeQuery(queryKey: unknown[], status: 'success' | 'pending' | 'error' = 'success'): Query {
  return {
    queryKey,
    state: { status },
  } as unknown as Query;
}

describe('queryCachePersister.shouldDehydrateQuery', () => {
  it('excludes signed media queries so expiring URLs are never persisted in MMKV', () => {
    expect(shouldDehydrateQuery(makeQuery(['media', 'signed', 'r2://bucket/video.mp4']))).toBe(false);
  });

  it('excludes non-success queries', () => {
    expect(shouldDehydrateQuery(makeQuery(['athlete-today'], 'pending'))).toBe(false);
    expect(shouldDehydrateQuery(makeQuery(['athlete-today'], 'error'))).toBe(false);
  });

  it('allows persistable read-mostly root keys', () => {
    expect(shouldDehydrateQuery(makeQuery(['athlete-today', '2026-11-21']))).toBe(true);
    expect(shouldDehydrateQuery(makeQuery(['workout-detail', 'w1']))).toBe(true);
  });

  it('excludes unlisted root keys', () => {
    expect(shouldDehydrateQuery(makeQuery(['support-tickets']))).toBe(false);
  });
});
