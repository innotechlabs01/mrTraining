'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Dumbbell, BarChart3, Flame, Activity, Heart, Smile, Trophy, Home, Users, BookOpen, Apple, Calendar, MessageCircle, HelpCircle, Settings, Globe } from 'lucide-react';

export type CoachPlan = 'strength' | 'hypertrophy' | 'fat-loss' | 'endurance' | 'recovery' | 'general' | 'performance';

export type CoachLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CoachProfile {
  id: string;
  name: string;
  specialization: string;
  plan: CoachPlan;
  level: CoachLevel;
  athletesCount: number;
  certifications: string[];
  coachCode: string;
  createdAt: string;
}

export type CoachSectionId = 'today' | 'athletes' | 'workouts' | 'training' | 'nutrition' | 'analytics' | 'community' | 'events' | 'settings' | 'support' | 'landing';

export const COACH_SECTION_LABELS: Record<CoachSectionId, string> = {
  today: 'Today',
  athletes: 'Athletes',
  workouts: 'Workouts',
  training: 'Training',
  nutrition: 'Nutrition',
  analytics: 'Analytics',
  community: 'Community',
  events: 'Events',
  settings: 'Settings',
  support: 'Support',
  landing: 'Landing',
};

export const COACH_SECTION_ICONS: Record<CoachSectionId, React.ElementType> = {
  today: Home,
  athletes: Users,
  workouts: Dumbbell,
  training: BookOpen,
  nutrition: Apple,
  analytics: BarChart3,
  community: MessageCircle,
  events: Calendar,
  settings: Settings,
  support: HelpCircle,
  landing: Globe,
};

export interface CoachPlanConfig {
  plan: CoachPlan;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sections: CoachSectionId[];
}

export const COACH_PLAN_CONFIGS: CoachPlanConfig[] = [
  {
    plan: 'strength',
    label: 'Strength Coach',
    description: 'Focus on maximal force and power development',
    icon: Dumbbell,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'analytics', 'settings'],
  },
  {
    plan: 'hypertrophy',
    label: 'Hypertrophy Specialist',
    description: 'Muscle growth and body composition focus',
    icon: BarChart3,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'analytics', 'settings'],
  },
  {
    plan: 'fat-loss',
    label: 'Fat Loss Coach',
    description: 'Lean out programs with nutrition focus',
    icon: Flame,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'nutrition', 'analytics', 'settings'],
  },
  {
    plan: 'endurance',
    label: 'Endurance Coach',
    description: 'Cardio and stamina building programs',
    icon: Activity,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'community', 'analytics', 'settings'],
  },
  {
    plan: 'recovery',
    label: 'Recovery Specialist',
    description: 'Rehab and return-to-play programs',
    icon: Heart,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'analytics', 'settings'],
  },
  {
    plan: 'general',
    label: 'General Coach',
    description: 'Balanced coaching for all-around athletes',
    icon: Smile,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'analytics', 'settings'],
  },
  {
    plan: 'performance',
    label: 'Performance Coach',
    description: 'Elite performance and competition prep',
    icon: Trophy,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    sections: ['today', 'athletes', 'workouts', 'training', 'analytics', 'events', 'settings'],
  },
];

interface CoachProfileContextValue {
  profile: CoachProfile | null;
  setProfile: (profile: CoachProfile) => void;
  updatePlan: (plan: CoachPlan) => void;
  updateLevel: (level: CoachLevel) => void;
  updateSpecialization: (spec: string) => void;
  resetProfile: () => void;
  isComplete: boolean;
}

const CoachProfileContext = createContext<CoachProfileContextValue | null>(null);

export function CoachProfileProvider({ children, initialProfile }: { children: React.ReactNode; initialProfile?: CoachProfile | null }) {
  const [profile, setProfile] = useState<CoachProfile | null>(initialProfile ?? null);

  const updatePlan = useCallback((plan: CoachPlan) => {
    setProfile(prev => prev ? { ...prev, plan } : null);
  }, []);

  const updateLevel = useCallback((level: CoachLevel) => {
    setProfile(prev => prev ? { ...prev, level } : null);
  }, []);

  const updateSpecialization = useCallback((spec: string) => {
    setProfile(prev => prev ? { ...prev, specialization: spec } : null);
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(null);
  }, []);

  const isComplete = profile !== null && profile.specialization !== '';

  return (
    <CoachProfileContext.Provider value={{
      profile,
      setProfile,
      updatePlan,
      updateLevel,
      updateSpecialization,
      resetProfile,
      isComplete,
    }}>
      {children}
    </CoachProfileContext.Provider>
  );
}

export function useCoachProfile(): CoachProfileContextValue {
  const ctx = useContext(CoachProfileContext);
  if (!ctx) throw new Error('useCoachProfile must be used within CoachProfileProvider');
  return ctx;
}

export function useCoachSections(): CoachSectionId[] {
  const { profile } = useCoachProfile();
  const config = COACH_PLAN_CONFIGS.find(p => p.plan === profile?.plan);
  return config?.sections ?? ['today', 'athletes', 'workouts', 'training', 'analytics', 'settings'];
}
