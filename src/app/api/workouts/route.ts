import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';
import { PocketBaseUserRepository } from '@/infrastructure/database/pocketbase.user-repo';
import { GetWorkoutsUseCase } from '@/application/training/get-workouts.use-case';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRepo = new PocketBaseUserRepository();
    const userResult = await userRepo.findByClerkId(clerkId);
    if (userResult.isFailure) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workoutRepo = new PocketBaseWorkoutRepository();
    const getWorkouts = new GetWorkoutsUseCase(workoutRepo);

    const result = await getWorkouts.execute(userResult.value.id);

    if (result.isFailure) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.value);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
