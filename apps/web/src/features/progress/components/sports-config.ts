import { Dumbbell, Footprints, Target, Waves, Bike, Trophy } from 'lucide-react';

export interface SportConfig {
  id: string;
  label: string;
  color: string;
  icon: React.ElementType;
  metrics: { label: string; unit: string }[];
}

export const SPORTS_CONFIG: Record<string, SportConfig> = {
  gym: {
    id: 'gym',
    label: 'Gym',
    color: '#ef4444',
    icon: Dumbbell,
    metrics: [{ label: 'Load', unit: 'RPE' }, { label: 'Volume', unit: 'kg' }],
  },
  running: {
    id: 'running',
    label: 'Running',
    color: '#3b82f6',
    icon: Footprints,
    metrics: [{ label: 'Distance', unit: 'km' }, { label: 'Pace', unit: 'min/km' }],
  },
  tennis: {
    id: 'tennis',
    label: 'Tennis',
    color: '#22c55e',
    icon: Target,
    metrics: [{ label: 'Performance', unit: '/10' }, { label: 'Win Rate', unit: '%' }],
  },
  swimming: {
    id: 'swimming',
    label: 'Swimming',
    color: '#06b6d4',
    icon: Waves,
    metrics: [{ label: 'Distance', unit: 'm' }, { label: 'Pace', unit: 'min/100m' }],
  },
  cycling: {
    id: 'cycling',
    label: 'Cycling',
    color: '#f59e0b',
    icon: Bike,
    metrics: [{ label: 'Power', unit: 'W' }, { label: 'Distance', unit: 'km' }],
  },
  crossfit: {
    id: 'crossfit',
    label: 'CrossFit',
    color: '#8b5cf6',
    icon: Trophy,
    metrics: [{ label: 'Score', unit: 'pts' }, { label: 'Reps', unit: 'reps' }],
  },
};
