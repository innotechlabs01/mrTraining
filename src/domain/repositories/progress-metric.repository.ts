import type { ProgressMetric } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';
import type { MetricType } from '@/shared/types';

export interface IProgressMetricRepository {
  findByUserId(userId: string): Promise<Result<ProgressMetric[], AppError>>;
  findByUserAndType(userId: string, metricType: MetricType): Promise<Result<ProgressMetric[], AppError>>;
  findById(id: string): Promise<Result<ProgressMetric, AppError>>;
  create(data: CreateProgressMetricData): Promise<Result<ProgressMetric, AppError>>;
}

export interface CreateProgressMetricData {
  userId: string;
  metricType: MetricType;
  value: number;
  unit: string;
  recordedAt?: Date;
}
