import type { Plan } from '@/domain/entities';
import type { IPlanRepository } from '@/domain/repositories';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export class GetPlansUseCase {
  constructor(private readonly planRepo: IPlanRepository) {}

  async execute(): Promise<Result<Plan[], AppError>> {
    return this.planRepo.findAll();
  }
}
