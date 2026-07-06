'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';
import { PocketBaseExerciseRepository } from '@/infrastructure/database/pocketbase.exercise-repo';
import type { Workout, Exercise } from '@/domain/entities';
import { cn } from '@/shared/lib/cn';

const workoutRepo = new PocketBaseWorkoutRepository();
const exerciseRepo = new PocketBaseExerciseRepository();

function SkeletonPulse() {
  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-6 shadow-[0_0_30px_rgba(255,107,0,0.08)]">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[#0F0F0F] rounded-lg" />
          ))}
        </div>
        <div className="h-12 bg-white/10 rounded-lg mt-6" />
      </div>
    </div>
  );
}

function ExerciseItem({ exercise }: { exercise: Exercise }) {
  return (
    <div className="bg-[#0F0F0F] border-l-[3px] border-l-[#FF6B00] rounded-lg p-4 flex items-center justify-between">
      <div className="flex-1">
        <h4 className="text-white font-medium text-sm">{exercise.name}</h4>
        <p className="text-gray-500 text-xs mt-1">
          {exercise.sets} sets x {exercise.reps} reps
          {exercise.weightKg !== null && ` @ ${exercise.weightKg}kg`}
          {exercise.restSeconds !== null && ` | ${exercise.restSeconds}s rest`}
        </p>
      </div>
      <div className={cn(
        'w-3 h-3 rounded-full',
        exercise.completed ? 'bg-[#FF6B00]' : 'bg-white/20'
      )} />
    </div>
  );
}

export function TodayWorkout() {
  const { userId } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodayWorkout() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const workoutsResult = await workoutRepo.findWorkoutsByUser(userId, { page: 1, perPage: 50 });
        if (workoutsResult.isFailure) {
          setError('Failed to load workouts');
          setLoading(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayWorkout = workoutsResult.value.items.find((w) => {
          const created = new Date(w.createdAt);
          return created >= today && created < tomorrow && !w.completed;
        });

        if (!todayWorkout) {
          setWorkout(null);
          setLoading(false);
          return;
        }

        setWorkout(todayWorkout);

        const exercisesResult = await exerciseRepo.findByWorkoutId(todayWorkout.id);
        if (exercisesResult.isSuccess) {
          setExercises(exercisesResult.value);
        }
      } catch {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchTodayWorkout();
  }, [userId]);

  if (loading) {
    return <SkeletonPulse />;
  }

  if (error) {
    return (
      <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-6 shadow-[0_0_30px_rgba(255,107,0,0.08)]">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-8 shadow-[0_0_30px_rgba(255,107,0,0.08)] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">Rest Day</h3>
        <p className="text-gray-500 text-sm">No workout scheduled for today. Recover and come back stronger.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-6 shadow-[0_0_30px_rgba(255,107,0,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{workout.name}</h3>
          <p className="text-gray-500 text-sm">Day {workout.dayNumber}</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-medium">
          {exercises.length} exercises
        </div>
      </div>

      {workout.notes && (
        <p className="text-gray-400 text-sm mb-4">{workout.notes}</p>
      )}

      <div className="space-y-3 mb-6">
        {exercises.map((exercise) => (
          <ExerciseItem key={exercise.id} exercise={exercise} />
        ))}
      </div>

      <button
        className={cn(
          'w-full py-3 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all duration-200',
          'bg-[#FF6B00] text-black hover:opacity-90 active:scale-95',
          'shadow-[0_0_20px_rgba(255,107,0,0.3)]'
        )}
      >
        Start Session
      </button>
    </div>
  );
}
