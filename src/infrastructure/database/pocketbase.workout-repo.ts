import type { Workout, WorkoutProgram } from '@/domain/entities';
import type {
  CreateWorkoutData,
  IWorkoutRepository,
  UpdateWorkoutData,
} from '@/domain/repositories';
import { type AppError, NotFoundError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import type { PaginatedResult, PaginationParams } from '@/shared/types';
import { mapWorkoutProgramRecord, mapWorkoutRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseWorkoutRepository implements IWorkoutRepository {
  async findPrograms(): Promise<Result<WorkoutProgram[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('workout_programs').getFullList();
      return Result.ok(records.map(mapWorkoutProgramRecord)) as unknown as Result<
        WorkoutProgram[],
        AppError
      >;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findProgramById(id: string): Promise<Result<WorkoutProgram, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('workout_programs').getOne(id);
      return Result.ok(mapWorkoutProgramRecord(record)) as unknown as Result<
        WorkoutProgram,
        AppError
      >;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('WorkoutProgram', id));
      return Result.fail(error as AppError);
    }
  }

  async findWorkoutsByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<Result<PaginatedResult<Workout>, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const page = params?.page ?? 1;
      const perPage = params?.perPage ?? 20;
      const records = await pb.collection('workouts').getList(page, perPage, {
        filter: `user_id = "${userId}"`,
        sort: '-created',
      });
      return Result.ok({
        items: records.items.map(mapWorkoutRecord),
        page: records.page,
        perPage: records.perPage,
        totalItems: records.totalItems,
        totalPages: records.totalPages,
      }) as unknown as Result<PaginatedResult<Workout>, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findWorkoutById(id: string): Promise<Result<Workout, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('workouts').getOne(id);
      return Result.ok(mapWorkoutRecord(record)) as unknown as Result<Workout, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Workout', id));
      return Result.fail(error as AppError);
    }
  }

  async createWorkout(data: CreateWorkoutData): Promise<Result<Workout, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('workouts').create({
        program_id: data.programId,
        user_id: data.userId,
        name: data.name,
        day_number: data.dayNumber,
        notes: data.notes ?? '',
        completed: false,
      });
      return Result.ok(mapWorkoutRecord(record)) as unknown as Result<Workout, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async updateWorkout(
    id: string,
    data: Partial<UpdateWorkoutData>,
  ): Promise<Result<Workout, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.notes !== undefined) updateData.notes = data.notes;
      const record = await pb.collection('workouts').update(id, updateData);
      return Result.ok(mapWorkoutRecord(record)) as unknown as Result<Workout, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Workout', id));
      return Result.fail(error as AppError);
    }
  }

  async completeWorkout(id: string): Promise<Result<Workout, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('workouts').update(id, {
        completed: true,
        completed_at: new Date().toISOString(),
      });
      return Result.ok(mapWorkoutRecord(record)) as unknown as Result<Workout, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Workout', id));
      return Result.fail(error as AppError);
    }
  }
}
