import type { ProgressMetric } from '@/domain/entities';
import type {
  CreateProgressMetricData,
  IProgressMetricRepository,
} from '@/domain/repositories';
import { type AppError, NotFoundError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import type { MetricType } from '@/shared/types';
import { mapProgressMetricRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseProgressMetricRepository implements IProgressMetricRepository {
  async findByUserId(userId: string): Promise<Result<ProgressMetric[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('progress_metrics').getFullList({
        filter: `user_id = "${userId}"`,
        sort: '-recorded_at',
      });
      return Result.ok(records.map(mapProgressMetricRecord)) as unknown as Result<
        ProgressMetric[],
        AppError
      >;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findByUserAndType(
    userId: string,
    metricType: MetricType,
  ): Promise<Result<ProgressMetric[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('progress_metrics').getFullList({
        filter: `user_id = "${userId}" && metric_type = "${metricType}"`,
        sort: '-recorded_at',
      });
      return Result.ok(records.map(mapProgressMetricRecord)) as unknown as Result<
        ProgressMetric[],
        AppError
      >;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findById(id: string): Promise<Result<ProgressMetric, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('progress_metrics').getOne(id);
      return Result.ok(mapProgressMetricRecord(record)) as unknown as Result<
        ProgressMetric,
        AppError
      >;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('ProgressMetric', id));
      return Result.fail(error as AppError);
    }
  }

  async create(data: CreateProgressMetricData): Promise<Result<ProgressMetric, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('progress_metrics').create({
        user_id: data.userId,
        metric_type: data.metricType,
        value: data.value,
        unit: data.unit,
        recorded_at: data.recordedAt?.toISOString() ?? new Date().toISOString(),
      });
      return Result.ok(mapProgressMetricRecord(record)) as unknown as Result<
        ProgressMetric,
        AppError
      >;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }
}
