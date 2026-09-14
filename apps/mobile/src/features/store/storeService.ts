import { smartClient as apiClient } from '@infrastructure/api/client';

export interface StoreProduct { id: string; name: string; price: number; stock?: number; brand?: string; image_url?: string; }

export const listStore = async (): Promise<StoreProduct[]> => {
  const { data } = await apiClient.get('/athlete/store');
  const payload = (data as any)?.data ?? data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as any)?.products)) return (payload as any).products;
  if (Array.isArray((payload as any)?.items)) return (payload as any).items;
  return [];
};

export const purchaseProduct = async (productId: string, quantity = 1): Promise<void> => {
  await apiClient.post('/athlete/store/purchase', { productId, quantity });
};
