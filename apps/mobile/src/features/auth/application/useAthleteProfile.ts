/**
 * useAthleteProfile — shared athlete profile query + pure helpers.
 * Single source for `/athlete/profile` data and training-preference labels.
 */
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../infrastructure/api/client';

export type AthleteModality = 'virtual' | 'hibrido' | 'presencial';

export const MODALITY_META: Array<{ key: AthleteModality; label: string }> = [
  { key: 'virtual', label: 'Virtual' },
  { key: 'hibrido', label: 'Híbrido' },
  { key: 'presencial', label: 'Presencial' },
];

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DAY_SHORT: Record<string, string> = {
  mon: 'L', tue: 'M', wed: 'M', thu: 'J', fri: 'V', sat: 'S', sun: 'D',
};
export const DAY_FULL: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
};
export const DAY_ABBR: Record<string, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
};

export type AthleteProfile = {
  id: string;
  name: string;
  sport: string;
  email: string;
  plan: { name: string; price: number };
  schedule: { days: string; time: string };
  schedule_days?: string;
  schedule_time?: string;
  readiness: { score: number };
  modality?: string;
  service_type?: string;
  serviceType?: string;
  emergency_contact?: string;
  weight?: number | string;
  age?: number | string;
  height?: number | string;
  birthday?: string;
};

export function normalizeModality(value: unknown): AthleteModality {
  const v = String(value ?? '').toLowerCase().trim();
  if (v === 'hibrido' || v === 'híbrido' || v === 'hybrid') return 'hibrido';
  if (v === 'presencial' || v === 'onsite' || v === 'in_person') return 'presencial';
  return 'virtual';
}

export function modalityLabel(value: unknown): string {
  const key = normalizeModality(value);
  return MODALITY_META.find((m) => m.key === key)?.label ?? 'Virtual';
}

export function scheduleDayKeys(daysRaw: unknown): string[] {
  const raw = String(daysRaw ?? '');
  if (!raw) return [];
  return raw
    .split(',')
    .map((d: string) => d.trim().toLowerCase())
    .filter((d: string) => DAY_KEYS.includes(d as (typeof DAY_KEYS)[number]));
}

export function scheduleSummary(daysRaw: unknown, timeRaw: unknown): string {
  const days = scheduleDayKeys(daysRaw).map((d) => DAY_SHORT[d] ?? d).join(' ');
  const time = String(timeRaw ?? '').trim();
  if (!days && !time) return '—';
  return [days, time].filter(Boolean).join(' · ');
}

export function profileScheduleRaw(profile: AthleteProfile | null | undefined): { days: string; time: string } {
  return {
    days: profile?.schedule_days ?? profile?.schedule?.days ?? '',
    time: profile?.schedule_time ?? profile?.schedule?.time ?? '',
  };
}

export function useAthleteProfile() {
  return useQuery({
    queryKey: ['athlete-profile'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/profile');
      return (data?.athlete_profile ?? data?.profile ?? data?.user ?? data ?? null) as AthleteProfile | null;
    },
    staleTime: 10 * 60 * 1000,
  });
}