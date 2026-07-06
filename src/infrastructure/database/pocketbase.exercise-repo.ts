import type { Exercise } from '@/domain/entities';
import type {
  CreateExerciseData,
  IExerciseRepository,
  UpdateExerciseData,
} from '@/domain/repositories';
import { type AppError, NotFoundError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import { mapExerciseRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseExerciseRepository implements IExerciseRepository {
  async findByWorkoutId(workoutId: string): Promise<Result<Exercise[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('exercises').getFullList({
        filter: `workout_id = "${workoutId}"`,
        sort: 'sort_order',
      });
      return Result.ok(records.map(mapExerciseRecord)) as unknown as Result<Exercise[], AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findById(id: string): Promise<Result<Exercise, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('exercises').getOne(id);
      return Result.ok(mapExerciseRecord(record)) as unknown as Result<Exercise, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Exercise', id));
      return Result.fail(error as AppError);
    }
  }

  async create(data: CreateExerciseData): Promise<Result<Exercise, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('exercises').create({
        workout_id: data.workoutId,
        name: data.name,
        sets: data.sets,
        reps: data.reps,
        weight_kg: data.weightKg ?? null,
        rest_seconds: data.restSeconds ?? null,
        notes: data.notes ?? '',
        sort_order: data.sortOrder ?? 0,
        completed: false,
      });
      return Result.ok(mapExerciseRecord(record)) as unknown as Result<Exercise, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async update(
    id: string,
    data: Partial<UpdateExerciseData>,
  ): Promise<Result<Exercise, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.sets !== undefined) updateData.sets = data.sets;
      if (data.reps !== undefined) updateData.reps = data.reps;
      if (data.weightKg !== undefined) updateData.weight_kg = data.weightKg;
      if (data.restSeconds !== undefined) updateData.rest_seconds = data.restSeconds;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
      const record = await pb.collection('exercises').update(id, updateData);
      return Result.ok(mapExerciseRecord(record)) as unknown as Result<Exercise, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Exercise', id));
      return Result.fail(error as AppError);
    }
  }

  async complete(id: string): Promise<Result<Exercise, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const record = await pb.collection('exercises').update(id, {
        completed: true,
      });
      return Result.ok(mapExerciseRecord(record)) as unknown as Result<Exercise, AppError>;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) return Result.fail(new NotFoundError('Exercise', id));
      return Result.fail(error as AppError);
    }
  }
}
