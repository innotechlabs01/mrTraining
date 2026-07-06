import type { Subscription } from '@/domain/entities';
import type {
  CreateSubscriptionData,
  ISubscriptionRepository,
  UpdateSubscriptionData,
} from '@/domain/repositories';
import { type AppError, NotFoundError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import { mapSubscriptionRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseSubscriptionRepository implements ISubscriptionRepository {
  async findByUserId(userId: string): Promise<Result<Subscription | null, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('subscriptions').getFullList({
        filter: `user_id = "${userId}"`,
        sort: '-created',
        limit: 1,
      });
      if (records.length === 0) {
        return Result.ok(null) as unknown as Result<Subscription | null, AppError>;
      }
      return Result.ok(mapSubscriptionRecord(records[0])) as unknown as Result<
        Subscription | null,
        AppError
      >;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findById(id: string): Promise<Result<Subscription, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('subscriptions').getOne(id);
      return Result.ok(mapSubscriptionRecord(record)) as unknown as Result<Subscription, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Subscription', id));
      return Result.fail(error as AppError);
    }
  }

  async create(data: CreateSubscriptionData): Promise<Result<Subscription, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('subscriptions').create({
        user_id: data.userId,
        plan_id: data.planId,
        status: data.status,
        paddle_subscription_id: data.paddleSubscriptionId,
        paddle_customer_id: data.paddleCustomerId,
        current_period_start: data.currentPeriodStart.toISOString(),
        current_period_end: data.currentPeriodEnd.toISOString(),
      });
      return Result.ok(mapSubscriptionRecord(record)) as unknown as Result<Subscription, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async update(
    id: string,
    data: Partial<UpdateSubscriptionData>,
  ): Promise<Result<Subscription, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const updateData: Record<string, unknown> = {};
      if (data.planId !== undefined) updateData.plan_id = data.planId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.paddleSubscriptionId !== undefined) {
        updateData.paddle_subscription_id = data.paddleSubscriptionId;
      }
      if (data.currentPeriodStart !== undefined) {
        updateData.current_period_start = data.currentPeriodStart.toISOString();
      }
      if (data.currentPeriodEnd !== undefined) {
        updateData.current_period_end = data.currentPeriodEnd.toISOString();
      }
      const record = await pb.collection('subscriptions').update(id, updateData);
      return Result.ok(mapSubscriptionRecord(record)) as unknown as Result<Subscription, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Subscription', id));
      return Result.fail(error as AppError);
    }
  }
}
