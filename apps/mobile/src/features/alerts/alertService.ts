import { smartClient as apiClient } from '@infrastructure/api/client';

export interface Alert {
  id: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  // add other fields as defined by backend DTO
}

/** Retrieve the computed alerts for the current athlete */
export const listAlerts = async (): Promise<Alert[]> => {
  const { data } = await apiClient.get<Alert[]>('/alerts');
  return data;
};
