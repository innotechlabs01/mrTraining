import { z } from 'zod';
import { mmkvGetJson } from '../../../infrastructure/storage/mmkv';
import type { CompleteRunningSessionRequest } from './useRunningWorkouts';

const completionSchema = z.object({
  distance: z.number().finite().nonnegative(),
  duration: z.number().int().nonnegative(),
  pace: z.string(),
  calories: z.number().int().nonnegative(),
  elevation: z.number().finite(),
  heart_rate: z.number().int().nonnegative(),
  cadence: z.number().int().nonnegative(),
  gps_route: z.string().optional(),
});

/** Treat persisted data as untrusted, including older/corrupt cache entries. */
export function readRunningCompletion(key: string): CompleteRunningSessionRequest | null {
  const parsed = completionSchema.safeParse(mmkvGetJson<unknown>(key));
  if (!parsed.success) return null;
  const { gps_route, ...required } = parsed.data;
  return gps_route === undefined ? required : { ...required, gps_route };
}
