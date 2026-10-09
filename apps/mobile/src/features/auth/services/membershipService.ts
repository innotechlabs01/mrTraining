/**
 * Membership Service
 * 
 * Servicios para consultar y gestionar la membresía del athlete.
 * 
 * NOTA: Estas APIs ya existen en el Go API (usado por la web).
 * Traemos la misma lógica al mobile para consistencia.
 */

import { apiClient } from '../infrastructure/api/client';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: string; // Formateado para mostrar (ej: "$19.99/mes")
  priceId: string; // ID de Stripe o identificador interno
  duration: 'monthly' | 'annual';
  features: string[];
  isPopular?: boolean;
}

export interface MembershipStatus {
  hasActiveMembership: boolean;
  currentPlan: Plan | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  isInGracePeriod: boolean;
}

/**
 * Obtiene el estado actual de la membresía del athlete
 */
export async function getMembershipStatus(
  athleteId: string
): Promise<MembershipStatus> {
  const response = await apiClient.get(`/athlete/membership/status/${athleteId}`);
  return response.data;
}

/**
 * Obtiene todos los planes disponibles que el coach ha creado
 * en el panel de web. Estos son los mismos planes que ve el usuario
 * en la versión web.
 */
export async function getAvailablePlans(
  athleteId: string
): Promise<Plan[]> {
  const response = await apiClient.get(`/athlete/membership/plans/${athleteId}`);
  return response.data;
}

/**
 * Compra/actualiza la membresía
 * 
 * - Si el usuario ya tiene membership, la actualiza
 * - Si es nuevo, la crea
 * 
 * El response debe contener:
 * - membershipId
 * - expiresAt
 * - planId
 * - status (active, trial, past_due, etc)
 */
export async function purchaseMembership(
  athleteId: string,
  planId: string,
  paymentMethod?: string
): Promise<{
  membershipId: string;
  expiresAt: string;
  status: 'active' | 'trial' | 'past_due';
  message: string;
}> {
  const response = await apiClient.post(`/athlete/membership/purchase`, {
    athleteId,
    planId,
    ...(paymentMethod && { paymentMethod }),
  });

  return response.data;
}

/**
 * Cancelar la membresía
 */
export async function cancelMembership(
  athleteId: string
): Promise<{
  membershipId: string;
  cancelAtPeriodEnd: boolean;
  status: 'active' | 'canceled';
  message: string;
}> {
  const response = await apiClient.post(`/athlete/membership/cancel`, {
    athleteId,
  });

  return response.data;
}