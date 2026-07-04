import type { IUserRepository } from '@/domain/repositories';
import { Result } from '@/shared/lib/result';
import type { User } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';

export class GetOrCreateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: {
    clerkId: string;
    email: string;
    fullName: string;
  }): Promise<Result<User, AppError>> {
    const existing = await this.userRepo.findByClerkId(input.clerkId);

    if (existing.isSuccess) {
      return existing;
    }

    return this.userRepo.create({
      clerkId: input.clerkId,
      email: input.email,
      fullName: input.fullName,
    });
  }
}
