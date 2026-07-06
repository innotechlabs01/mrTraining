import type { Subscription } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export interface ISubscriptionRepository {
  findByUserId(userId: string): Promise<Result<Subscription | null, AppError>>;
  findById(id: string): Promise<Result<Subscription, AppError>>;
  create(data: CreateSubscriptionData): Promise<Result<Subscription, AppError>>;
  update(id: string, data: Partial<UpdateSubscriptionData>): Promise<Result<Subscription, AppError>>;
}

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface UpdateSubscriptionData {
  planId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'trialing';
  paddleSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}
