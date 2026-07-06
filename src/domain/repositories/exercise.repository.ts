import type { Exercise } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export interface IExerciseRepository {
  findByWorkoutId(workoutId: string): Promise<Result<Exercise[], AppError>>;
  findById(id: string): Promise<Result<Exercise, AppError>>;
  create(data: CreateExerciseData): Promise<Result<Exercise, AppError>>;
  update(id: string, data: Partial<UpdateExerciseData>): Promise<Result<Exercise, AppError>>;
  complete(id: string): Promise<Result<Exercise, AppError>>;
}

export interface CreateExerciseData {
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg?: number;
  restSeconds?: number;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateExerciseData {
  name?: string;
  sets?: number;
  reps?: number;
  weightKg?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  sortOrder?: number;
}
