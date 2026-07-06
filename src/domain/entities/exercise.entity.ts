export interface ExerciseProps {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
  sortOrder: number;
  completed: boolean;
}

export class Exercise {
  private constructor(private readonly props: ExerciseProps) {}

  static create(props: ExerciseProps): Exercise {
    return new Exercise(props);
  }

  get id(): string {
    return this.props.id;
  }
  get workoutId(): string {
    return this.props.workoutId;
  }
  get name(): string {
    return this.props.name;
  }
  get sets(): number {
    return this.props.sets;
  }
  get reps(): number {
    return this.props.reps;
  }
  get weightKg(): number | null {
    return this.props.weightKg;
  }
  get restSeconds(): number | null {
    return this.props.restSeconds;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }
  get completed(): boolean {
    return this.props.completed;
  }

  markComplete(): Exercise {
    return Exercise.create({
      ...this.props,
      completed: true,
    });
  }

  toJSON() {
    return { ...this.props };
  }
}
