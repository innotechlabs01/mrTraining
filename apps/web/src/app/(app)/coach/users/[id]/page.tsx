'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from '@clerk/nextjs'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { usePlans } from '@/features/coach/hooks/usePlans'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Lazy-loaded panels — not in initial bundle
const AthleteResumenPanel = dynamic(
  () => import('@/features/coach/components/insights/AthleteResumenPanel').then(mod => mod.AthleteResumenPanel),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)
const AthleteTrainingPanels = dynamic(
  () => import('@/features/coach/components/insights/AthleteTrainingPanels').then(mod => mod.AthleteTrainingPanels),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)
const AthleteHealthPanels = dynamic(
  () => import('@/features/coach/components/insights/AthleteHealthPanels').then(mod => mod.AthleteHealthPanels),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)
const AthleteRunningPanel = dynamic(
  () => import('@/features/coach/components/insights/AthleteRunningPanel').then(mod => mod.AthleteRunningPanel),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)

// Per-icon lucide imports (tree-shake friendly)
import { ArrowLeft, CreditCard } from 'lucide-react'

interface AthleteMembershipInfo {
  id: string
  plan_name: string
  plan_price: number
  billing_period: string
  status: string
  current_period_end: string
}

function AthleteMembershipPanel({ athleteId }: { athleteId: string }) {
  const { session } = useSession()
  const { plans, isLoading: plansLoading } = usePlans()
  const [membership, setMembership] = useState<AthleteMembershipInfo | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_GO_API_URL || ''

  useEffect(() => {
    let active = true
    async function load() {
      if (!session || !athleteId) return
      setLoading(true)
      try {
        const token = await session.getToken()
        const res = await fetch(`${apiBase}/api/v1/coach/athletes/${athleteId}/membership`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = await res.json()
          const data = json?.data ?? json
          if (active && data && data.id) {
            setMembership(data)
            if (data.billing_period === 'yearly') setBillingPeriod('yearly')
          }
        }
      } catch {
        // Non-fatal: athlete may not have a membership yet
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, athleteId, apiBase])

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      const matched = membership
        ? plans.find((p) => p.name.toLowerCase() === membership.plan_name.toLowerCase())
        : undefined
      setSelectedPlanId(matched?.id ?? plans[0].id)
    }
  }, [plans, membership, selectedPlanId])

  const handleAssign = async () => {
    if (!session || !selectedPlanId) return
    setSaving(true)
    setFeedback(null)
    try {
      const token = await session.getToken()
      const res = await fetch(`${apiBase}/api/v1/coach/athletes/${athleteId}/membership`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          billing_period: billingPeriod,
          status: 'active',
        }),
      })
      if (!res.ok) throw new Error('Error asignando membresía')
      const json = await res.json()
      const updated = json?.data ?? json
      if (updated?.id) setMembership(updated)
      setFeedback({ text: 'Membresía asignada. El atleta ya ve el cobro en su app móvil.', ok: true })
    } catch {
      setFeedback({ text: 'No se pudo asignar el plan al atleta.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <CreditCard size={16} className="text-brand-primary" />
          Membresía y Plan del Atleta
        </h2>
        {membership && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-brand-primary/15 text-brand-primary font-medium">
            {membership.plan_name} · ${Number(membership.plan_price || 0).toLocaleString('es-CO')} COP ({membership.status})
          </span>
        )}
      </div>

      {loading || plansLoading ? (
        <div className="h-12 rounded-lg bg-white/5 animate-pulse" />
      ) : plans.length === 0 ? (
        <p className="text-xs text-white/50">
          Aún no tienes planes creados.{' '}
          <Link href="/coach/planes" className="text-brand-primary underline">
            Crea un plan en /coach/planes
          </Link>{' '}
          para poder asignarlo a tus atletas.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-white/50 mb-1">Plan del Coach</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full rounded-lg bg-surface-2 border border-white/10 px-3 py-2 text-sm text-white"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${Number(p.price || 0).toLocaleString('es-CO')} COP
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Periodicidad</label>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value as 'monthly' | 'yearly')}
              className="w-full rounded-lg bg-surface-2 border border-white/10 px-3 py-2 text-sm text-white"
            >
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAssign}
            disabled={saving || !selectedPlanId}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Asignar membresía'}
          </button>
        </div>
      )}

      {feedback && (
        <p className={`text-xs ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {feedback.text}
        </p>
      )}
    </section>
  )
}

export default function CoachUserDetailPage() {
  const params = useParams()
  const { getAthleteById } = useAthletes()
  const athleteId = params.id as string
  const athlete = getAthleteById(athleteId)

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-lg font-semibold text-white">Atleta no encontrado</p>
        <Link href="/coach/users" className="text-sm text-brand-primary mt-2 hover:underline">
          Volver a usuarios
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link
        href="/coach/users"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
      >
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 flex items-center justify-center text-lg font-bold text-brand-primary">
          {athlete.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-white">{athlete.name}</h1>
          <p className="text-sm text-white/40">{athlete.sport}</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteResumenPanel athleteId={athlete.id} />
      </Suspense>

      <AthleteMembershipPanel athleteId={athlete.id} />

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteTrainingPanels athleteId={athlete.id} />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteHealthPanels athleteId={athlete.id} />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteRunningPanel athleteId={athlete.id} />
      </Suspense>

      {/* Gamificación — inline, lightweight */}
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          Gamificación
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">—</p>
            <p className="text-xs text-white/40 mt-1">Racha actual</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">—</p>
            <p className="text-xs text-white/40 mt-1">Racha máxima</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">—</p>
            <p className="text-xs text-white/40 mt-1">Badges</p>
          </div>
        </div>
      </section>
    </div>
  )
}
