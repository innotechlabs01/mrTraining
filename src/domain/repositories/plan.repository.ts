import type { Plan } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export interface IPlanRepository {
  findAll(): Promise<Result<Plan[], AppError>>;
  findById(id: string): Promise<Result<Plan, AppError>>;
  findBySlug(slug: string): Promise<Result<Plan, AppError>>;
}
