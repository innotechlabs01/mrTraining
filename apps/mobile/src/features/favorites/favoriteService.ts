import { smartClient as apiClient } from '@infrastructure/api/client';

// Types matching Go DTOs
export interface Favorite {
  id: string;
  type: 'workout' | 'video' | 'article';
  title: string;
  description?: string;
  duration?: string;
  calories?: string;
  exercises?: string;
}

/** Fetch the list of favorites for the current athlete */
export const listFavorites = async (): Promise<Favorite[]> => {
  const { data } = await apiClient.get<any>('/favorites');
  const arr = (data as any)?.data ?? data;
  return Array.isArray(arr) ? arr : [];
};

/** Add a new favorite */
export const addFavorite = async (fav: Omit<Favorite, 'id'>): Promise<Favorite> => {
  const { data } = await apiClient.post<Favorite>('/favorites', fav);
  return data;
};

/** Remove a favorite by its ID */
export const removeFavorite = async (id: string): Promise<void> => {
  await apiClient.delete<void>(`/favorites/${id}`);
};
