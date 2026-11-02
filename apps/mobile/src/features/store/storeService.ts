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

// --- MercadoPago cart checkout ---

export type CartPreferenceItem = { productId: string; quantity: number };

export type CartPreference = {
  orderId: string;
  initPoint: string;
  total: number;
  currency: string;
};

/** Create a pending order + MP preference for the cart (server validates stock). */
export const createCartPreference = async (
  items: CartPreferenceItem[],
): Promise<CartPreference> => {
  const { data } = await apiClient.post('/payments/cart/preference', { items });
  const payload = (data as any)?.data ?? data;
  return payload as CartPreference;
};

export type StoreOrder = {
  id: string;
  athlete_id: string;
  status: 'pending' | 'paid' | 'failed';
  total: number;
  currency: string;
  external_ref?: string;
  created_at: string;
  paid_at?: string;
};

/** Poll an order's status after the browser payment flow. */
export const getOrder = async (orderId: string): Promise<StoreOrder> => {
  const { data } = await apiClient.get(`/payments/orders/${orderId}`);
  const payload = (data as any)?.data ?? data;
  return payload as StoreOrder;
};
