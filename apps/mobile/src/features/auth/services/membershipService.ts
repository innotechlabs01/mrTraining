/**
 * Membership Service
 *
 * Servicios para consultar y gestionar la membresía del athlete.
 * Todos los endpoints consumen el Go API (/api/v1/*) como única fuente de verdad.
 * El athleteId se resuelve desde el token de Clerk (auth interceptor), no se pasa en la URL.
 */

import { apiClient } from '../../../infrastructure/api/client';

export interface MembershipSummary {
  id: string;
  planName: string;
  planPrice: number;
  billingPeriod: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paymentDueDate: string;
  athleteId: string;
  coachId: string;
}

export interface MembershipStatus {
  hasActiveMembership: boolean;
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'no_membership' | 'none';
  isInGracePeriod: boolean;
  daysRemaining: number | null;
  expiresAt: string | null;
  membership: MembershipSummary | null;
  membershipId: string;
}

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

interface CancelResponse {
  membershipId: string;
  cancelAtPeriodEnd: boolean;
  status: 'active' | 'canceled';
  message: string;
}

/**
 * Obtiene el estado actual de la membresía del athlete.
 * GET /api/v1/athletes/membership/status — sin path param, usa token del auth.
 */
export async function getMembershipStatus(): Promise<MembershipStatus> {
  const { data } = await apiClient.get<MembershipStatus>('/athletes/membership/status');
  return data;
}

/**
 * Obtiene la membresía actual del athlete (GET /api/v1/memberships).
 * Se adapta a Plan[] para compatibilidad con pantallas de selección de plan.
 */
export async function getAvailablePlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<{ id?: string; plan_name?: string; plan_price?: number; billing_period?: string }>('/memberships');

  if (!data || !data.id) {
    return [];
  }

  const planPrice = typeof data.plan_price === 'number' ? data.plan_price : 0;
  const duration: 'monthly' | 'annual' =
    data.billing_period === 'annual' || data.billing_period === 'yearly' ? 'annual' : 'monthly';

  return [
    {
      id: data.id,
      name: data.plan_name ?? 'Membresía',
      description: `Plan ${duration === 'annual' ? 'anual' : 'mensual'}`,
      price: `$${planPrice.toFixed(2)}/mes`,
      priceId: data.id,
      duration,
      features: [],
    },
  ];
}

/**
 * Cancelar la membresía.
 * PUT /api/v1/memberships/:id/cancel
 */
export async function cancelMembership(
  membershipId: string
): Promise<CancelResponse> {
  const { data } = await apiClient.put<CancelResponse>(
    `/memberships/${membershipId}/cancel`
  );
  return data;
}

/**
 * Inicia la compra de membresía vía MercadoPago.
 * Crea una preferencia de checkout (POST /payments/membership/preference)
 * y devuelve el initPoint para abrir en el navegador.
 */
export async function purchaseMembership(): Promise<{
  membershipId: string;
  planName: string;
  initPoint: string;
  total: number;
  currency: string;
}> {
  const { createMembershipPreference } = await import(
    '../../../features/membership/membershipPayment'
  );
  return createMembershipPreference();
}
