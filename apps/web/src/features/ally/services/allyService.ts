/**
 * Ally Service — Web (coach dashboard).
 * Consume los endpoints de Alianzas del Go API.
 *
 * Endpoints:
 *   POST   /api/v1/coach/allies              — crear aliado (coach)
 *   GET    /api/v1/coach/allies              — listar aliados del coach
 *   GET    /api/v1/coach/allies/:id          — ver aliado específico
 *   GET    /api/v1/ally/products             — catálogo productos (ally)
 *   POST   /api/v1/ally/products             — crear producto (ally)
 *   GET    /api/v1/ally/services             — catálogo servicios (ally)
 *   GET    /api/v1/ally/operations           — ver operaciones (ally)
 *   POST   /api/v1/ally/payment-declarations — declarar pago (ally)
 *   GET    /api/v1/ally/payment-declarations — listar declaraciones (ally)
 *   GET    /api/v1/coach/commission-entries  — ver comisiones (coach)
 *   GET    /api/v1/coach/settlements         — ver liquidaciones (coach)
 */

import { goFetch } from '../../../lib/api/go-client';

export interface Ally {
  id: string;
  ownerUserId: string;
  legalName: string;
  commercialName: string;
  category: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllyRequest {
  legalName: string;
  commercialName: string;
  category: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  ownerUserId?: string;
}

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
  /** Service-specific fields (optional, only present for service-type products) */
  durationMin?: number;
  capacity?: number;
}

export interface CreateAllyProductRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  currency: string;
  stock: number;
  active: boolean;
}

export interface AllyOperation {
  id: string;
  athleteId: string;
  type: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface CommissionEntry {
  id: string;
  operationId: string;
  rateBps: number;
  fixedAmountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface CoachSettlement {
  id: string;
  coachId: string;
  status: string;
  totalCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

/**
 * Lista los aliados del coach autenticado.
 */
export async function listCoachAllies(): Promise<Ally[]> {
  return goFetch<Ally[]>('/coach/allies', { auth: true });
}

/**
 * Crea un nuevo aliado (requiere rol coach).
 */
export async function createAlly(data: CreateAllyRequest): Promise<Ally> {
  return goFetch<Ally>('/coach/allies', {
    auth: true,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Obtiene un aliado específico por ID (requiere rol coach).
 */
export async function getCoachAlly(allyId: string): Promise<Ally> {
  return goFetch<Ally>(`/coach/allies/${allyId}`, { auth: true });
}

/**
 * Lista los productos del catálogo del aliado autenticado.
 */
export async function listAllyProducts(): Promise<AllyProduct[]> {
  return goFetch<AllyProduct[]>('/ally/products', { auth: true });
}

/**
 * Crea un producto en el catálogo del aliado (requiere rol ally).
 */
export async function createAllyProduct(data: CreateAllyProductRequest): Promise<AllyProduct> {
  return goFetch<AllyProduct>('/ally/products', {
    auth: true,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Lista los servicios del catálogo del aliado autenticado.
 */
export async function listAllyServices(): Promise<AllyProduct[]> {
  return goFetch<AllyProduct[]>('/ally/services', { auth: true });
}

/**
 * Lista las operaciones del aliado autenticado.
 */
export async function listAllyOperations(): Promise<AllyOperation[]> {
  return goFetch<AllyOperation[]>('/ally/operations', { auth: true });
}

/**
 * Lista las declaraciones de pago del aliado autenticado.
 */
export async function listAllyPaymentDeclarations(): Promise<any[]> {
  return goFetch<any[]>('/ally/payment-declarations', { auth: true });
}

/**
 * Lista las comisiones del coach autenticado.
 */
export async function listCoachCommissionEntries(): Promise<CommissionEntry[]> {
  return goFetch<CommissionEntry[]>('/coach/commission-entries', { auth: true });
}

/**
 * Lista las liquidaciones del coach autenticado.
 */
export async function listCoachSettlements(): Promise<CoachSettlement[]> {
  return goFetch<CoachSettlement[]>('/coach/settlements', { auth: true });
}
