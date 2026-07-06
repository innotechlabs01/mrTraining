import type { User } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export interface IUserRepository {
  findById(id: string): Promise<Result<User, AppError>>;
  findByClerkId(clerkId: string): Promise<Result<User, AppError>>;
  findByEmail(email: string): Promise<Result<User, AppError>>;
  create(data: CreateUserData): Promise<Result<User, AppError>>;
  update(id: string, data: Partial<UpdateUserData>): Promise<Result<User, AppError>>;
}

export interface CreateUserData {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export interface UpdateUserData {
  fullName?: string;
  role?: string;
  avatarUrl?: string;
}
