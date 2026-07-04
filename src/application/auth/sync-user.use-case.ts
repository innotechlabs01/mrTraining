import type { IUserRepository } from '@/domain/repositories';
import { Result } from '@/shared/lib/result';
import type { User } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import { logger } from '@/shared/lib/logger';

interface SyncUserInput {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export class SyncUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: SyncUserInput): Promise<Result<User, AppError>> {
    logger.info('Syncing user from Clerk', { clerkId: input.clerkId });

    const existing = await this.userRepo.findByClerkId(input.clerkId);

    if (existing.isSuccess) {
      logger.info('User already exists, updating', { clerkId: input.clerkId });
      return this.userRepo.update(existing.value.id, {
        fullName: input.fullName,
        avatarUrl: input.avatarUrl,
      });
    }

    logger.info('Creating new user', { clerkId: input.clerkId });
    return this.userRepo.create({
      clerkId: input.clerkId,
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
    });
  }
}
