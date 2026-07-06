import type { RecordModel } from 'pocketbase';
import { Exercise, Plan, ProgressMetric, Subscription, User, Workout, WorkoutProgram } from '@/domain/entities';
import type { DifficultyLevel, MetricType, PlanTier, SubscriptionStatus, UserRole } from '@/shared/types';

export function mapUserRecord(record: RecordModel): User {
  return User.create({
    id: record.id,
    clerkId: record.clerk_id,
    email: record.email,
    fullName: record.full_name,
    role: record.role as UserRole,
    avatarUrl: record.avatar_url || null,
    createdAt: new Date(record.created),
    updatedAt: new Date(record.updated),
  });
}

export function mapPlanRecord(record: RecordModel): Plan {
  return Plan.create({
    id: record.id,
    name: record.name,
    slug: record.slug,
    priceMonthly: record.price_monthly,
    priceAnnual: record.price_annual ?? null,
    features: Array.isArray(record.features) ? record.features : [],
    paddlePriceId: record.paddle_price_id,
    isFeatured: record.is_featured ?? false,
    sortOrder: record.sort_order ?? 0,
  });
}

export function mapSubscriptionRecord(record: RecordModel): Subscription {
  return Subscription.create({
    id: record.id,
    userId: record.user_id,
    planId: record.plan_id,
    status: record.status as SubscriptionStatus,
    paddleSubscriptionId: record.paddle_subscription_id,
    paddleCustomerId: record.paddle_customer_id,
    currentPeriodStart: new Date(record.current_period_start),
    currentPeriodEnd: new Date(record.current_period_end),
    createdAt: new Date(record.created),
  });
}

export function mapWorkoutProgramRecord(record: RecordModel): WorkoutProgram {
  return WorkoutProgram.create({
    id: record.id,
    name: record.name,
    description: record.description,
    difficulty: record.difficulty as DifficultyLevel,
    planTier: record.plan_tier as PlanTier,
    durationWeeks: record.duration_weeks,
    createdAt: new Date(record.created),
  });
}

export function mapWorkoutRecord(record: RecordModel): Workout {
  return Workout.create({
    id: record.id,
    programId: record.program_id,
    userId: record.user_id,
    name: record.name,
    dayNumber: record.day_number,
    completed: record.completed ?? false,
    completedAt: record.completed_at ? new Date(record.completed_at) : null,
    notes: record.notes ?? null,
    createdAt: new Date(record.created),
  });
}

export function mapExerciseRecord(record: RecordModel): Exercise {
  return Exercise.create({
    id: record.id,
    workoutId: record.workout_id,
    name: record.name,
    sets: record.sets,
    reps: record.reps,
    weightKg: record.weight_kg ?? null,
    restSeconds: record.rest_seconds ?? null,
    notes: record.notes ?? null,
    sortOrder: record.sort_order ?? 0,
    completed: record.completed ?? false,
  });
}

export function mapProgressMetricRecord(record: RecordModel): ProgressMetric {
  return ProgressMetric.create({
    id: record.id,
    userId: record.user_id,
    metricType: record.metric_type as MetricType,
    value: record.value,
    unit: record.unit,
    recordedAt: new Date(record.recorded_at),
  });
}
