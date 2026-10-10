'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { coachingApi } from '@/features/shared/api/client'
import type { Plan } from '@/features/coach/types'
import { formatPlanPrice, periodLabel } from '@/features/coach/utils/planPricing'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CoachPlansLandingPage() {
  const params = useParams<{ id: string }>()
  const coachId = params.id

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['public-coach-plans', coachId],
    queryFn: () => coachingApi.getPublicPlans<Plan[]>(coachId),
    enabled: !!coachId,
    retry: false,
    staleTime: 5 * 60_000,
  })

  const activePlans = plans.filter((p) => p.isActive)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-6">
          <div className="h-20 w-20 rounded-full bg-surface-3 animate-pulse mx-auto" />
          <div className="h-6 w-48 bg-surface-3 animate-pulse rounded mx-auto" />
          <div className="h-4 w-64 bg-surface-2 animate-pulse rounded mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-surface-1 p-6 animate-pulse space-y-4">
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-12 bg-white/5 rounded" />
                <div className="h-8 w-1/2 bg-white/10 rounded" />
                <div className="h-4 w-1/4 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const coach = plans[0] ? {
    name: 'Coach',
    specialty: 'Entrenador',
    city: '',
    bio: '',
    avatarUrl: '',
  } : null

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <main className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-4 pb-6 mb-6 border-b border-white/10">
          <div className="w-16 h-16 rounded-full bg-brand-primary/20 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {coach?.avatarUrl ? (
              <Image
                src={coach.avatarUrl}
                alt=""
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-brand-primary">{coach?.name?.charAt(0) || 'C'}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-display font-bold text-white truncate">{coach?.name || 'Coach'}</h1>
            <p className="text-sm text-white/60">
              {coach?.specialty || 'Entrenador'}{coach?.city && ` · ${coach.city}`}
            </p>
            {coach?.bio && (
              <p className="text-sm text-white/60 line-clamp-1 mt-1">{coach.bio}</p>
            )}
          </div>
        </header>

        {activePlans.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <Check className="w-12 h-12 text-white/40" aria-hidden="true" />
            <h2 className="mt-4 text-base font-semibold text-white">Este coach aún no publicó planes</h2>
            <p className="mt-2 max-w-sm text-sm text-white/60">
              Escríbele y armanos un plan a tu medida.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {activePlans.map((plan, i) => {
              const discountActive = plan.discount && plan.discount.value > 0
              const finalPrice = discountActive
                ? plan.price - (plan.discount.type === 'percentage'
                    ? Math.round(plan.price * plan.discount.value / 100)
                    : Math.min(plan.price, plan.discount.value))
                : plan.price
              const saved = plan.price - finalPrice

              return (
                <article
                  key={plan.id}
                  className="relative flex flex-col rounded-2xl border border-white/10 bg-surface-1 p-5
                           transition-colors hover:border-white/20 focus-within:border-brand-primary"
                >
                  <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">{plan.description}</p>

                  <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                    <span className="text-2xl font-bold font-display text-white">{formatPlanPrice(finalPrice, plan.currency)}</span>
                    {discountActive && <span className="text-sm text-white/30 line-through">{formatPlanPrice(plan.price, plan.currency)}</span>}
                    {discountActive && saved > 0 && <span className="text-xs text-green-400">ahorras {formatPlanPrice(saved, plan.currency)}</span>}
                    <span className="ml-auto text-xs text-white/40">/{periodLabel(plan.billingPeriod)}</span>
                  </div>

                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                        <Check size={12} className="text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={`/planes/${plan.id}`}
                    className="mt-5 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg
                               bg-brand-primary text-white text-sm font-medium
                               hover:bg-brand-primary-hover transition-colors
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50
                               focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1"
                  >
                    Elegir plan
                  </a>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}