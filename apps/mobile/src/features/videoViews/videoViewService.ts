import { smartClient as apiClient } from '@infrastructure/api/client';

export interface VideoView {
  viewId: string;
  athleteID: string;
  exerciseID: string;
  action: string;
  // other fields as needed
}

/** Record a video view */
export const recordView = async (view: Partial<VideoView>): Promise<VideoView> => {
  const { data } = await apiClient.post<VideoView>('/video-views', view);
  return data;
};

/** List video views, optionally filtered by exerciseID */
export const listViews = async (athleteID: string, exerciseID?: string): Promise<VideoView[]> => {
  const params = new URLSearchParams();
  if (exerciseID) params.append('exerciseID', exerciseID);
  // athleteID may be inferred from auth, but include if needed
  const endpoint = `/video-views${params.toString() ? '?' + params.toString() : ''}`;
  const { data } = await apiClient.get<VideoView[]>(endpoint);
  return data;
};
