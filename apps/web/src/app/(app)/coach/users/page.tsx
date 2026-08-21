'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Flag, ShieldCheck, ShieldAlert, ShieldX, RefreshCw, UserPlus, Copy, Check, Smartphone, Share2, QrCode } from 'lucide-react'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'
import { coachingApi } from '@/features/shared/api/client'
import { cn } from '@/lib/utils'
import { InviteAthleteModal } from '@/features/coach/components/InviteAthleteModal'

type MembershipSummary = {
  id: string
  athleteId: string
  planName: string
  planPrice: number
  status: string
  paymentDueDate: string
}

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Al dia', className: 'bg-green-500/10 text-green-400 border-green-500/20', icon: ShieldCheck },
  grace_period: { label: 'Por vencer', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: ShieldAlert },
  suspended: { label: 'Suspendido', className: 'bg-red-500/10 text-red-400 border-red-500/20', icon: ShieldX },
  cancelled: { label: 'Cancelado', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: ShieldX },
}

function getDisplayName(a: { name: string; email?: string }): string {
  const n = (a.name || '').trim();
  if (!n || n.startsWith('user_') || n.includes('@')) {
    const email = (a as { email?: string }).email ?? '';
    const local = email.split('@')[0]?.trim();
    return local || n || 'Athlete';
  }
  return n;
}

export default function CoachUsersPage() {
  const { athletes, isLoading } = useAthletes()
  const { openPanel } = useCoachPanel()
  const [search, setSearch] = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)
  const [memberships, setMemberships] = useState<MembershipSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [coachCode, setCoachCode] = useState('')
  const [coachLoading, setCoachLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    coachingApi.getMemberships<MembershipSummary[]>()
      .then(data => setMemberships(data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCoachLoading(true)
    fetch('/api/coach/profile')
      .then(res => res.json())
      .then(data => {
        const coach = data?.coach
        setCoachCode(coach?.coach_code || coach?.coachCode || '')
      })
      .catch(() => {})
      .finally(() => setCoachLoading(false))
  }, [])

  const inviteLink = coachCode
    ? `${process.env.NEXT_PUBLIC_WEB_INVITE_URL || 'https://mr-training.vercel.app/invite'}?code=${coachCode}`
    : ''

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = inviteLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getMembership = (athleteId: string) =>
    memberships.find(m => m.athleteId === athleteId)

  const handleCardClick = async (athleteId: string) => {
    try {
      const detail = await coachingApi.getAthleteById<Record<string, unknown>>(athleteId)
      if (detail) openPanel('athlete', detail)
    } catch {
      openPanel('athlete', { id: athleteId } as Record<string, unknown>)
    }
  }

  const filtered = athletes.filter((a) => {
    const dn = getDisplayName(a).toLowerCase()
    const matchName = dn.includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
    const matchSport = a.sport.toLowerCase().includes(search.toLowerCase())
    const textMatch = matchName || matchSport
    if (filterFlagged && !a.flag) return false
    if (statusFilter) {
      const m = getMembership(a.id)
      if (!m || m.status !== statusFilter) return false
    }
    return textMatch
  })

  const statusCounts = {
    active: memberships.filter(m => m.status === 'active').length,
    grace_period: memberships.filter(m => m.status === 'grace_period').length,
    suspended: memberships.filter(m => m.status === 'suspended').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Usuarios</h1>
          <p className="text-sm text-white/40 mt-1">
            {athletes.length} atletas · {statusCounts.active} al dia · {statusCounts.suspended} suspendidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            <UserPlus size={16} />
            Invite athlete
          </button>
          <div className="flex items-center gap-1.5 bg-surface-1 border border-white/5 rounded-lg p-1">
            {[
              { key: null, label: 'Todos' },
              { key: 'active', label: 'Al dia' },
              { key: 'grace_period', label: 'Por vencer' },
              { key: 'suspended', label: 'Suspendidos' },
            ].map((opt) => (
              <button
                key={opt.key ?? 'all'}
                onClick={() => setStatusFilter(opt.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  statusFilter === opt.key
                    ? 'bg-brand-primary/20 text-brand-primary'
                    : 'text-white/40 hover:text-white/70',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFilterFlagged(!filterFlagged)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filterFlagged
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-white/10 text-white/40 hover:border-white/20',
            )}
          >
            <Flag size={14} className="inline mr-1.5" />
            Con flags
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-primary/10 to-surface-1 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/20 flex items-center justify-center shrink-0">
              <Smartphone size={24} className="text-brand-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Invita a tus atletas</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Comparte tu código o el link para que descarguen la app y se unan a tu equipo.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-surface-0 border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[140px]">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Tu código</p>
              {coachLoading ? (
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse mx-auto mt-1" />
              ) : (
                <p className="text-xl font-mono font-bold text-brand-primary tracking-widest">{coachCode || '—'}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-surface-0 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/50 max-w-[220px] truncate">
                {inviteLink || 'Generando link...'}
              </div>
              <button
                onClick={handleCopy}
                disabled={!inviteLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 mb-2">Cómo funciona</p>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              'Comparte el código o link con tu atleta',
              'El atleta descarga la app y abre el link',
              'Se vincula automáticamente a tu equipo',
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] flex items-center justify-center shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar atleta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-1 border border-white/5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((athlete, i) => {
          const membership = getMembership(athlete.id)
          const statusInfo = membership ? STATUS_BADGE[membership.status] : null
          const Icon = statusInfo?.icon ?? ShieldCheck

          return (
            <motion.button
              key={athlete.id}
              onClick={() => handleCardClick(athlete.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="w-full text-left rounded-2xl border border-white/5 bg-surface-1 p-4 hover:border-brand-primary/30 hover:bg-surface-2 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 flex items-center justify-center text-sm font-bold text-brand-primary">
                    {getDisplayName(athlete)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{getDisplayName(athlete)}</p>
                    <p className="text-xs text-white/40">{athlete.sport}</p>
                  </div>
                </div>
                <div className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold',
                  athlete.readiness.score >= 80 ? 'bg-green-500/10 text-green-400' :
                  athlete.readiness.score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400',
                )}>
                  {athlete.readiness.score}%
                </div>
              </div>

              {membership && (
                <div className="mt-3 flex items-center justify-between p-2 rounded-lg border bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    {statusInfo && (
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', statusInfo.className)}>
                        <Icon size={10} />
                        {statusInfo.label}
                      </span>
                    )}
                    <span className="text-xs text-white/50">
                      {membership.planName} · ${membership.planPrice}/mes
                    </span>
                  </div>
                </div>
              )}

              {athlete.flag && (
                <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <Flag size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/80">{athlete.flag.message}</p>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      <InviteAthleteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  )
}
