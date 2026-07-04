import type { Workout, WorkoutProgram } from '@/domain/entities';
import type { Result } from '@/shared/lib/result';
import type { AppError } from '@/shared/lib/errors';
import type { PaginationParams, PaginatedResult } from '@/shared/types';

export interface IWorkoutRepository {
  findPrograms(): Promise<Result<WorkoutProgram[], AppError>>;
  findProgramById(id: string): Promise<Result<WorkoutProgram, AppError>>;
  findWorkoutsByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<Result<PaginatedResult<Workout>, AppError>>;
  findWorkoutById(id: string): Promise<Result<Workout, AppError>>;
  createWorkout(data: CreateWorkoutData): Promise<Result<Workout, AppError>>;
  updateWorkout(id: string, data: Partial<UpdateWorkoutData>): Promise<Result<Workout, AppError>>;
  completeWorkout(id: string): Promise<Result<Workout, AppError>>;
}

export interface CreateWorkoutData {
  programId: string;
  userId: string;
  name: string;
  dayNumber: number;
  notes?: string;
}

export interface UpdateWorkoutData {
  name?: string;
  notes?: string;
}
