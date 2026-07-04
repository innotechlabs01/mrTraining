import type { RecordModel } from 'pocketbase';
import type { PlanTier, SubscriptionStatus, DifficultyLevel, UserRole } from '@/shared/types';
import { User, Plan, Subscription, WorkoutProgram, Workout } from '@/domain/entities';

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
    stripePriceIdMonthly: record.stripe_price_id_monthly,
    stripePriceIdAnnual: record.stripe_price_id_annual ?? null,
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
    stripeSubscriptionId: record.stripe_subscription_id,
    stripeCustomerId: record.stripe_customer_id,
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
