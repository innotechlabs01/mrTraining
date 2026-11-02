import { z } from "zod";

/**
 * Zod schemas validating Go API athlete responses.
 *
 * Go API (source of truth) returns ListResponse envelopes:
 *   { data: T[], total: number }
 * The axios response interceptor already unwraps ListResponse to the bare
 * array, so these schemas validate the unwrapped `data` array elements and
 * the top-level envelope when it arrives unwrapped.
 */

export const AthleteWorkoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sport_type: z.string().min(1),
  scheduled_date: z.string().datetime({ offset: true }).optional(),
  status: z.string().min(1),
});

export type AthleteWorkout = z.infer<typeof AthleteWorkoutSchema>;

export const AthleteWorkoutsResponseSchema = z.object({
  data: z.array(AthleteWorkoutSchema),
  total: z.number().int().nonnegative(),
});

export type AthleteWorkoutsResponse = z.infer<
  typeof AthleteWorkoutsResponseSchema
>;

export const AthleteMetricSchema = z.object({
  metric_date: z.string().datetime({ offset: true }).optional(),
  weight_kg: z.number().nonnegative().optional(),
  resting_hr_bpm: z.number().int().nonnegative().optional(),
  vo2max_estimate: z.number().nonnegative().optional(),
});

export type AthleteMetric = z.infer<typeof AthleteMetricSchema>;

export const AthleteMetricsResponseListSchema = z.object({
  data: z.array(AthleteMetricSchema),
  total: z.number().int().nonnegative(),
});

export type AthleteMetricsResponseList = z.infer<
  typeof AthleteMetricsResponseListSchema
>;

export const AthleteMessageSchema = z.object({
  id: z.string().uuid(),
  coach_id: z.string().uuid(),
  coach_name: z.string().optional(),
  subject: z.string().optional(),
  last_message: z.string().optional(),
  last_sent_at: z.string().datetime({ offset: true }).optional(),
  unread_count: z.number().int().nonnegative(),
  created_at: z.string().datetime({ offset: true }),
});

export type AthleteMessage = z.infer<typeof AthleteMessageSchema>;

export const AthleteMessagesResponseSchema = z.object({
  data: z.array(AthleteMessageSchema),
  total: z.number().int().nonnegative(),
});

export type AthleteMessagesResponse = z.infer<
  typeof AthleteMessagesResponseSchema
>;

/**
 * Parse and validate a raw API response against a Zod schema.
 * Throws on invalid shape so React Query surfaces it as an error state.
 */
export function parseAthleteResponse<T>(schema: z.ZodType<T>, raw: unknown): T {
  return schema.parse(raw);
}
