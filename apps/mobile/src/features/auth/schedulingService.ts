import { smartClient as apiClient } from '@infrastructure/api/client';

export interface AvailabilitySlot {
  id: string;
  coachId?: string | undefined;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityResult {
  coachId: string;
  coachName: string;
  slots: AvailabilitySlot[];
}

export interface AppointmentInfo {
  id: string;
  coach_id: string;
  athlete_id: string;
  athlete_name?: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  notes?: string;
  meet_room_id?: string;
}

type RawSlot = {
  id?: string;
  coachId?: string;
  coach_id?: string;
  dayOfWeek?: number;
  day_of_week?: number;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
};

function normalizeSlot(s: RawSlot, idx: number): AvailabilitySlot {
  return {
    id: s.id ?? `slot-${idx}`,
    coachId: s.coachId ?? s.coach_id,
    dayOfWeek: s.dayOfWeek ?? s.day_of_week ?? 0,
    startTime: s.startTime ?? s.start_time ?? '',
    endTime: s.endTime ?? s.end_time ?? '',
  };
}

export const getAvailability = async (coachId?: string): Promise<AvailabilityResult> => {
  const query = coachId ? `?coachId=${encodeURIComponent(coachId)}` : '';
  const { data } = await apiClient.get(`/athlete/availability${query}`);
  const payload = (data as any)?.data ?? data;
  const rawSlots: RawSlot[] = payload?.availability ?? (Array.isArray(payload) ? payload : []);
  return {
    coachId: payload?.coach_id ?? coachId ?? '',
    coachName: payload?.coach_name ?? '',
    slots: rawSlots.map(normalizeSlot),
  };
};

export const createAppointment = async (params: {
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | undefined;
  title?: string | undefined;
  coachId?: string | undefined;
}): Promise<AppointmentInfo> => {
  const { data } = await apiClient.post('/athlete/appointments', params);
  return ((data as any)?.data ?? data) as AppointmentInfo;
};

export const getMyAppointments = async (): Promise<AppointmentInfo[]> => {
  const { data } = await apiClient.get('/athlete/appointments');
  const payload = (data as any)?.data ?? data;
  return Array.isArray(payload) ? payload : [];
};
