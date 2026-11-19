'use client'

import { useUser } from '@clerk/nextjs'

/**
 * PlanEntitlements are the plan a user is subscribed to, read from the
 * Clerk PUBLIC metadata.
 *
 * The Go API writes them when the checkout is created (status "pending") and
 * when the payment provider confirms the payment (status "active"), so the
 * UI can gate features without a round trip to the database.
 */
export interface PlanEntitlements {
  /** Platform plan id (e.g. "plan-seed-pro"). */
  plan: string
  /** Human readable plan name (e.g. "Plan Pro"). */
  planName: string
  /** Subscription state: "pending" until the payment is confirmed. */
  planStatus: string
  /** True once the payment is confirmed — the plan features are unlocked. */
  active: boolean
  loading: boolean
}

export function usePlanEntitlements(): PlanEntitlements {
  const { user } = useUser()

  const metadata = user?.publicMetadata as
    | { plan?: string; planName?: string; planStatus?: string }
    | undefined

  const plan = metadata?.plan ?? ''
  const planName = metadata?.planName ?? ''
  const planStatus = metadata?.planStatus ?? ''

  return {
    plan,
    planName,
    planStatus,
    active: planStatus === 'active',
    loading: !user,
  }
}
