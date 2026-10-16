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
 * Obtiene los planes disponibles para comprar.
 * TODO: Conectar a GET /api/v1/athletes/membership/plans cuando exista en el Go API.
 * Por ahora devuelve planes de ejemplo para que el flujo de membresía funcione.
 */
export async function getAvailablePlans(): Promise<Plan[]> {
  return [
    {
      id: 'plan_monthly',
      name: 'Mensual',
      description: 'Acceso completo por 1 mes',
      price: '$19.99/mes',
      priceId: 'plan_monthly',
      duration: 'monthly',
      features: ['Entrenamientos ilimitados', 'Seguimiento de progreso', 'Soporte prioritario'],
      isPopular: false,
    },
    {
      id: 'plan_annual',
      name: 'Anual',
      description: 'Acceso completo por 1 año (ahorra 20%)',
      price: '$199.99/año',
      priceId: 'plan_annual',
      duration: 'annual',
      features: ['Entrenamientos ilimitados', 'Seguimiento de progreso', 'Soporte prioritario', 'Descarga de videos'],
      isPopular: true,
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
