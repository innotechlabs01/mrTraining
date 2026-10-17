/**
 * Ally Service — Servicios para consumir los endpoints de Alianzas del Go API.
 *
 * Endpoints del Go API (según routes.go):
 *   POST   /api/v1/athlete/orders          — crear orden (athlete)
 *   POST   /api/v1/athlete/reservations    — crear reserva (athlete)
 *   GET    /api/v1/athlete/operations/:id  — ver operación (athlete)
 *   GET    /api/v1/ally/products           — catálogo de productos (ally)
 *   POST   /api/v1/ally/products           — crear producto (ally)
 *   GET    /api/v1/ally/services           — catálogo de servicios (ally)
 *   POST   /api/v1/ally/redemptions        — crear redención QR (ally)
 *   POST   /api/v1/ally/redemptions/:token/redeem — redimir (ally)
 */

import { apiClient } from '../../../infrastructure/api/client';

export interface AllyProduct {
  id: string;
  allyId: string;
  name: string;
  description: string;
  imageUrl?: string;
  priceCents: number;
  currency: string;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AllyService {
  id: string;
  allyId: string;
  name: string;
  description: string;
  imageUrl?: string;
  priceCents: number;
  currency: string;
  durationMin: number;
  capacity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AllyOrder {
  id: string;
  athleteId: string;
  allyId: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface AllyReservation {
  id: string;
  athleteId: string;
  allyId: string;
  serviceId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface AllyOperation {
  id: string;
  athleteId: string;
  type: string; // 'order' | 'reservation' | 'redemption'
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
}

/**
 * Crea una orden para un atleta (POST /athlete/orders).
 */
export async function createOrder(body: {
  allyId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethodId: string;
}): Promise<AllyOrder> {
  const { data } = await apiClient.post<AllyOrder>('/athlete/orders', body);
  return data;
}

/**
 * Crea una reserva para un atleta (POST /athlete/reservations).
 */
export async function createReservation(body: {
  allyId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
}): Promise<AllyReservation> {
  const { data } = await apiClient.post<AllyReservation>('/athlete/reservations', body);
  return data;
}

/**
 * Obtiene una operación por ID (GET /athlete/operations/:id).
 */
export async function getOperation(operationId: string): Promise<AllyOperation> {
  const { data } = await apiClient.get<AllyOperation>(`/athlete/operations/${operationId}`);
  return data;
}

/**
 * Lista los productos disponibles del aliado vinculado al atleta (GET /athlete/ally/products).
 * Requiere rol athlete. Resuelve el coach vinculado al atleta y devuelve los productos
 * activos del aliado de ese coach.
 */
export async function listAllyProducts(): Promise<AllyProduct[]> {
  const { data } = await apiClient.get<{ data: AllyProduct[] }>('/athlete/ally/products');
  return data?.data ?? [];
}

/**
 * Lista los servicios disponibles del aliado vinculado al atleta (GET /athlete/ally/services).
 * Requiere rol athlete. Resuelve el coach vinculado al atleta y devuelve los servicios
 * activos del aliado de ese coach.
 */
export async function listAllyServices(): Promise<AllyService[]> {
  const { data } = await apiClient.get<{ data: AllyService[] }>('/athlete/ally/services');
  return data?.data ?? [];
}

/**
 * Crea una redención QR (POST /ally/redemptions).
 * Requiere rol ally.
 */
export async function createRedemption(body: {
  allyId: string;
  athleteId: string;
  totalCents: number;
  currency: string;
}): Promise<{ id: string; token: string }> {
  const { data } = await apiClient.post<{ id: string; token: string }>('/ally/redemptions', body);
  return data;
}

/**
 * Redime un token QR (POST /ally/redemptions/:token/redeem).
 * Requiere rol ally.
 */
export async function redeemToken(token: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(`/ally/redemptions/${token}/redeem`);
  return data;
}
