import type { IPlanRepository } from '@/domain/repositories';
import { Result } from '@/shared/lib/result';
import type { Plan } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';

export class GetPlansUseCase {
  constructor(private readonly planRepo: IPlanRepository) {}

  async execute(): Promise<Result<Plan[], AppError>> {
    return this.planRepo.findAll();
  }
}
