import { smartClient as apiClient } from '@infrastructure/api/client';

export interface ForumTopic { id: string; title: string; description: string; category: string; }
export interface Challenge { id: string; title: string; description: string; durationMinutes: number; calories: number; participantsCount: number; }
export interface CommunityMessage { id: string; userId: string; userName: string; message: string; createdAt: string; }

export const getCommunity = async (): Promise<{ forums: ForumTopic[]; challenges: Challenge[] }> => {
  const { data } = await apiClient.get('/athlete/community');
  // handle wrapped response { data: {forums...}} or direct
  const payload = (data as any)?.data ?? data;
  return payload as { forums: ForumTopic[]; challenges: Challenge[] };
};

export const listMessages = async (forumId = 'default'): Promise<CommunityMessage[]> => {
  const { data } = await apiClient.get(`/athlete/community/messages?forumId=${forumId}`);
  const arr = (data as any)?.data ?? data;
  return Array.isArray(arr) ? arr : (arr?.messages ?? []);
};

export const sendMessage = async (forumId: string, message: string): Promise<void> => {
  await apiClient.post('/athlete/community/messages', { forumId, message });
};
