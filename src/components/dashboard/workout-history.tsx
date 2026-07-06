'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';
import type { Workout } from '@/domain/entities';

const workoutRepo = new PocketBaseWorkoutRepository();

export function WorkoutHistory() {
  const { userId } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const result = await workoutRepo.findWorkoutsByUser(userId, { page: 1, perPage: 10 });
      if (result.isSuccess) setWorkouts(result.value.items.filter(w => w.completed));
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-6 animate-pulse">
        <div className="h-4 w-32 bg-[#1C1C1C] rounded mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-[#1C1C1C] rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-6">
      <span className="text-[#FF6B00] font-label-bold text-xs uppercase tracking-widest">Workout History</span>
      <div className="space-y-3 mt-4">
        {workouts.length === 0 && (
          <p className="text-[#C4C7C7] text-sm">No completed workouts yet.</p>
        )}
        {workouts.map((w) => (
          <div key={w.id} className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-body-md text-sm font-bold">{w.name}</p>
                <p className="text-[#C4C7C7] text-xs">
                  {w.completedAt ? new Date(w.completedAt).toLocaleDateString() : 'Completed'}
                </p>
              </div>
            </div>
            <span className="text-[#FF6B00] text-xs font-label-bold uppercase">Done</span>
          </div>
        ))}
      </div>
    </div>
  );
}
