import type { Workout } from '@/domain/entities';
import type { IWorkoutRepository } from '@/domain/repositories';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';
import type { PaginatedResult, PaginationParams } from '@/shared/types';

export class GetWorkoutsUseCase {
  constructor(private readonly workoutRepo: IWorkoutRepository) {}

  async execute(
    userId: string,
    params?: PaginationParams,
  ): Promise<Result<PaginatedResult<Workout>, AppError>> {
    return this.workoutRepo.findWorkoutsByUser(userId, params);
  }
}
