'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCoachProfile } from '@/features/coach/contexts/CoachProfileContext';
import { COACH_PLAN_CONFIGS, CoachPlan, CoachLevel } from '@/features/coach/contexts/CoachProfileContext';
import { cn } from '@/lib/utils';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

const COACH_LEVELS: { value: CoachLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to coaching' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-3 years coaching' },
  { value: 'advanced', label: 'Advanced', desc: '3-5 years coaching' },
  { value: 'expert', label: 'Expert', desc: '5+ years coaching' },
];

export default function CoachPlanPage() {
  const router = useRouter();
  const { profile, updatePlan, updateLevel, updateSpecialization, isComplete } = useCoachProfile();
  const [selectedPlan, setSelectedPlan] = useState<CoachPlan>(profile?.plan ?? 'general');
  const [selectedLevel, setSelectedLevel] = useState(profile?.level ?? 'intermediate');
  const [specialization, setSpecialization] = useState(profile?.specialization ?? '');

  useEffect(() => {
    if (isComplete && profile?.specialization) {
      router.replace('/coach');
    }
  }, [isComplete, profile, router]);

  const handleSave = () => {
    updatePlan(selectedPlan);
    updateLevel(selectedLevel);
    updateSpecialization(specialization);
    router.push('/coach');
  };

  if (isComplete && profile?.specialization) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Coach Setup</h1>
        <p className="text-white/50 text-sm">Configure your coaching profile and plan</p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Coaching Plan</h2>
        <div className="grid grid-cols-2 gap-3">
          {COACH_PLAN_CONFIGS.map(config => {
            const Icon = config.icon;
            const isSelected = selectedPlan === config.plan;
            return (
              <button
                key={config.plan}
                onClick={() => setSelectedPlan(config.plan)}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bgColor)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  <span className="font-semibold text-sm">{config.label}</span>
                  {isSelected && <Check className="w-4 h-4 ml-auto text-green-400" />}
                </div>
                <p className="text-xs text-white/40">{config.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Experience Level</h2>
        <div className="grid grid-cols-2 gap-3">
          {COACH_LEVELS.map(level => {
            const isSelected = selectedLevel === level.value;
            return (
              <button
                key={level.value}
                onClick={() => setSelectedLevel(level.value)}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  isSelected
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                )}
              >
                <p className="font-semibold text-sm">{level.label}</p>
                <p className="text-xs text-white/40 mt-1">{level.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Specialization</h2>
        <input
          type="text"
          value={specialization}
          onChange={e => setSpecialization(e.target.value)}
          placeholder="e.g. Strength, Conditioning, Rehab..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
      >
        Save Profile <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}