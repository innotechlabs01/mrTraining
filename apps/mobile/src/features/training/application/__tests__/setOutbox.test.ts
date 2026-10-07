import { Alert } from 'react-native';
import {
  enqueueSetOutbox,
  flushSetOutbox,
  getSetOutboxCount,
  subscribeSetOutbox,
  type OutboxStep,
} from '../setOutbox';
import { mmkv } from '../../../../infrastructure/storage/mmkv';

const step = (path: string, body: Record<string, unknown> = {}): OutboxStep => ({
  path,
  body,
});

const okPost = () => Promise.resolve({});
const offlinePost = () => Promise.reject(new Error('Network request failed'));
const fourOhFourPost = () =>
  Promise.reject({ response: { status: 422 } });

describe('setOutbox', () => {
  beforeEach(() => {
    mmkv.clearAll();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('enqueues items, exposes the count, and notifies subscribers', () => {
    const seen: number[] = [];
    const unsub = subscribeSetOutbox((count) => seen.push(count));

    enqueueSetOutbox([step('/sets', { exerciseId: 'e1' })]);
    expect(getSetOutboxCount()).toBe(1);
    expect(seen).toEqual([1]);

    unsub();
  });

  it('flushes in queue order and leaves the queue empty', async () => {
    enqueueSetOutbox([step('/sets', { n: 1 }), step('/progress', { n: 1 })]);
    enqueueSetOutbox([step('/sets', { n: 2 })]);

    const calls: Array<[string, Record<string, unknown>]> = [];
    const remaining = await flushSetOutbox(async (path, body) => {
      calls.push([path, body]);
    });

    expect(remaining).toBe(0);
    expect(getSetOutboxCount()).toBe(0);
    expect(calls).toEqual([
      ['/sets', { n: 1 }],
      ['/progress', { n: 1 }],
      ['/sets', { n: 2 }],
    ]);
  });

  it('stops at the first transport error and keeps the remaining queue', async () => {
    enqueueSetOutbox([step('/sets', { n: 1 })]);
    enqueueSetOutbox([step('/sets', { n: 2 })]);

    let attempt = 0;
    const post = (_path: string, _body: Record<string, unknown>) => {
      attempt += 1;
      return attempt === 1 ? okPost() : offlinePost();
    };

    const remaining = await flushSetOutbox(post);
    expect(remaining).toBe(1);
    expect(getSetOutboxCount()).toBe(1);
    expect(attempt).toBe(2);

    const calls: string[] = [];
    await flushSetOutbox(async (path) => {
      calls.push(path);
    });
    expect(calls).toEqual(['/sets']);
    expect(getSetOutboxCount()).toBe(0);
  });

  it('drops a 4xx item, alerts exactly once per pass, and keeps flushing', async () => {
    enqueueSetOutbox([step('/sets', { n: 1 })]);
    enqueueSetOutbox([step('/sets', { n: 2 })]);
    enqueueSetOutbox([step('/sets', { n: 3 })]);

    const calls: number[] = [];
    const remaining = await flushSetOutbox(async (_path, body) => {
      const n = body.n as number;
      calls.push(n);
      if (n < 3) return fourOhFourPost();
      return okPost();
    });

    expect(remaining).toBe(0);
    expect(calls).toEqual([1, 2, 3]);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed 4xx retry from breaking multi-step order on later passes', async () => {
    enqueueSetOutbox([step('/sets', { n: 1 }), step('/complete')]);

    await flushSetOutbox(offlinePost);
    expect(getSetOutboxCount()).toBe(1);

    const calls: string[] = [];
    await flushSetOutbox(async (path) => {
      calls.push(path);
      return {};
    });
    expect(calls).toEqual(['/sets', '/complete']);
    expect(getSetOutboxCount()).toBe(0);
  });
});
