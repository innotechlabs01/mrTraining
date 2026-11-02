import { smartClient as apiClient } from '@infrastructure/api/client';

export interface AvailabilitySlot { id: string; dayOfWeek: number; startTime: string; endTime: string; }

export const getAvailability = async (): Promise<AvailabilitySlot[]> => {
  const { data } = await apiClient.get('/athlete/availability');
  const payload = (data as any)?.data ?? data;
  return payload?.availability ?? (Array.isArray(payload) ? payload : []);
};

export const createAppointment = async (params: { date: string; startTime: string; endTime: string; notes?: string }): Promise<void> => {
  await apiClient.post('/athlete/appointments', params);
};
