export type PlanTier = 'starter' | 'elite' | 'pro';
export type UserRole = 'member' | 'elite' | 'pro' | 'admin';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type MetricType = 'weight' | 'body_fat' | 'vo2max' | 'hrv' | 'bench' | 'squat' | 'deadlift';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}
