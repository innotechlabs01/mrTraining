import { HydrationBoundary, dehydrate, QueryClient } from '@tanstack/react-query'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import CoachDashboard from '@/features/coach/components/dashboard/CoachDashboard'
import { mapGoEvent } from '@/features/shared/api/client'
import type { AthleteBrief, DashboardMetrics, RevenuePoint } from '@/features/coach/types'

/**
 * Server-side prefetch (Sprint 2 — ms latency): the coach dashboard's five
 * hot queries resolve BEFORE the first HTML byte, so the client hydrates with
 * data instead of firing N round-trips after JS load + Clerk init.
 *
 * Fail-open by design: any failed prefetch leaves the cache empty and the
 * client hook fetches exactly as before. Keys/staleTimes mirror the client
 * hooks so hydrated data is reused, not refetched.
 */

const GO = process.env.NEXT_PUBLIC_GO_API_URL || ''
type DashboardData = { metrics: DashboardMetrics; extra: Record<string, unknown>; revenueHistory: RevenuePoint[] } | null

function cookieHeader(): string {
  return cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

async function goGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${GO}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`go ${path}: ${res.status}`)
  return res.json()
}

async function nextGet(path: string): Promise<unknown> {
  const res = await fetch(path, { headers: { cookie: cookieHeader() }, cache: 'no-store' })
  if (!res.ok) throw new Error(`next ${path}: ${res.status}`)
  return res.json()
}

export default async function CoachPage() {
  const queryClient = new QueryClient()

  let token: string | null = null
  try {
    const authResult = await auth()
    token = await authResult.getToken()
  } catch {
    token = null
  }

  const prefetches: Promise<unknown>[] = [
    // Dashboard metrics live in a Next.js route (cookie auth).
    queryClient.prefetchQuery({
      queryKey: ['coach-dashboard'],
      staleTime: 30_000,
      queryFn: () => nextGet('/api/coaching/dashboard') as Promise<DashboardData>,
    }),
  ]

  if (token && GO) {
    prefetches.push(
      queryClient.prefetchQuery({
        queryKey: ['events'],
        staleTime: 30_000,
        queryFn: async () => {
          try {
            const res = (await goGet('/api/v1/events', token as string)) as
              | unknown[]
              | { data?: Array<Parameters<typeof mapGoEvent>[0]> }
            return Array.isArray(res) ? res : (res.data ?? []).map(mapGoEvent)
          } catch {
            return nextGet('/api/coaching/events') // parity with client fallback
          }
        },
      }),
      queryClient.prefetchQuery({
        queryKey: ['athletes'],
        staleTime: 5 * 60_000,
        queryFn: async () => {
          try {
            const res = (await goGet('/api/v1/coaches/me/athletes', token as string)) as
              | AthleteBrief[]
              | { data?: AthleteBrief[] }
            return Array.isArray(res) ? res : (res.data ?? [])
          } catch {
            return nextGet('/api/coaching/athletes')
          }
        },
      }),
      queryClient.prefetchQuery({
        queryKey: ['coach-products'],
        staleTime: 60_000,
        queryFn: async () => {
          const res = (await goGet('/api/v1/products', token as string)) as { data?: unknown[] }
          return res.data ?? []
        },
      }),
      queryClient.prefetchQuery({
        queryKey: ['coach-sales'],
        staleTime: 60_000,
        queryFn: async () => {
          const res = (await goGet('/api/v1/coaches/sales', token as string)) as { data?: unknown[] }
          return res.data ?? []
        },
      }),
    )
  }

  await Promise.allSettled(prefetches)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CoachDashboard />
    </HydrationBoundary>
  )
}
