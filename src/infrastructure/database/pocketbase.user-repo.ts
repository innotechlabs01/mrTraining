import type { IUserRepository, CreateUserData, UpdateUserData } from '@/domain/repositories';
import { Result } from '@/shared/lib/result';
import type { AppError } from '@/shared/lib/errors';
import { User } from '@/domain/entities';
import { NotFoundError } from '@/shared/lib/errors';
import { getAdminPocketBase } from './pocketbase.client';
import { mapUserRecord } from '../mappers/pb-to-entity.mapper';

export class PocketBaseUserRepository implements IUserRepository {
  async findById(id: string): Promise<Result<User, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('users').getOne(id);
      return Result.ok(mapUserRecord(record)) as unknown as Result<User, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('User', id));
      return Result.fail(error as AppError);
    }
  }

  async findByClerkId(clerkId: string): Promise<Result<User, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('users').getList(1, 1, {
        filter: `clerk_id = "${clerkId}"`,
      });
      if (records.items.length === 0) {
        return Result.fail(new NotFoundError('User', clerkId));
      }
      return Result.ok(mapUserRecord(records.items[0])) as unknown as Result<User, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findByEmail(email: string): Promise<Result<User, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('users').getList(1, 1, {
        filter: `email = "${email}"`,
      });
      if (records.items.length === 0) {
        return Result.fail(new NotFoundError('User', email));
      }
      return Result.ok(mapUserRecord(records.items[0])) as unknown as Result<User, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async create(data: CreateUserData): Promise<Result<User, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('users').create({
        clerk_id: data.clerkId,
        email: data.email,
        full_name: data.fullName,
        role: 'member',
        avatar_url: data.avatarUrl ?? '',
      });
      return Result.ok(mapUserRecord(record)) as unknown as Result<User, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async update(id: string, data: Partial<UpdateUserData>): Promise<Result<User, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const updateData: Record<string, unknown> = {};
      if (data.fullName !== undefined) updateData.full_name = data.fullName;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
      const record = await pb.collection('users').update(id, updateData);
      return Result.ok(mapUserRecord(record)) as unknown as Result<User, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('User', id));
      return Result.fail(error as AppError);
    }
  }
}
