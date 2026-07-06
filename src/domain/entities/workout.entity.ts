import type { DifficultyLevel } from '@/shared/types';

export interface WorkoutProgramProps {
  id: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  planTier: 'starter' | 'elite' | 'pro';
  durationWeeks: number;
  createdAt: Date;
}

export class WorkoutProgram {
  private constructor(private readonly props: WorkoutProgramProps) {}

  static create(props: WorkoutProgramProps): WorkoutProgram {
    return new WorkoutProgram(props);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get difficulty(): DifficultyLevel {
    return this.props.difficulty;
  }
  get planTier(): string {
    return this.props.planTier;
  }
  get durationWeeks(): number {
    return this.props.durationWeeks;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return { ...this.props };
  }
}

export interface WorkoutProps {
  id: string;
  programId: string;
  userId: string;
  name: string;
  dayNumber: number;
  completed: boolean;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export class Workout {
  private constructor(private readonly props: WorkoutProps) {}

  static create(props: WorkoutProps): Workout {
    return new Workout(props);
  }

  get id(): string {
    return this.props.id;
  }
  get programId(): string {
    return this.props.programId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get dayNumber(): number {
    return this.props.dayNumber;
  }
  get completed(): boolean {
    return this.props.completed;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  markComplete(): Workout {
    return Workout.create({
      ...this.props,
      completed: true,
      completedAt: new Date(),
    });
  }

  toJSON() {
    return { ...this.props };
  }
}
