import type { IPlanRepository } from '@/domain/repositories';
import { Plan } from '@/domain/entities';
import { Result } from '@/shared/lib/result';
import { NotFoundError, type AppError } from '@/shared/lib/errors';
import { getAdminPocketBase } from './pocketbase.client';
import { mapPlanRecord } from '../mappers/pb-to-entity.mapper';

export class PocketBasePlanRepository implements IPlanRepository {
  async findAll(): Promise<Result<Plan[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('plans').getFullList({ sort: 'sort_order' });
      return Result.ok(records.map(mapPlanRecord)) as unknown as Result<Plan[], AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findById(id: string): Promise<Result<Plan, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('plans').getOne(id);
      return Result.ok(mapPlanRecord(record)) as unknown as Result<Plan, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Plan', id));
      return Result.fail(error as AppError);
    }
  }

  async findBySlug(slug: string): Promise<Result<Plan, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('plans').getList(1, 1, {
        filter: `slug = "${slug}"`,
      });
      if (records.items.length === 0) {
        return Result.fail(new NotFoundError('Plan', slug));
      }
      return Result.ok(mapPlanRecord(records.items[0])) as unknown as Result<Plan, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }
}
