'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  UserPlus,
  AlertTriangle,
  Calendar,
  Flame,
  Target,
  Activity,
  ArrowUpRight,
  Sparkles,
  Clock,
  Zap,
  CreditCard,
  Trophy,
  ShoppingCart,
  Package,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_DASHBOARD_METRICS, MOCK_REVENUE_HISTORY, MOCK_DASHBOARD_EXTRA, MOCK_ATHLETES } from '../../data/_mocks'
import { useEvents } from '../../hooks/useEvents'
import { useProducts } from '../../hooks/useProducts'
import { useSales } from '../../hooks/useSales'
import type { CoachEvent, EventFormat } from '../../types'

const FORMAT_LABEL: Record<EventFormat, string> = {
  lista: 'Lista',
  formulario: 'Formulario',
  running: 'Running',
}

const FORMAT_STYLE: Record<EventFormat, string> = {
  lista: 'bg-emerald-500/15 text-emerald-400',
  formulario: 'bg-blue-500/15 text-blue-400',
  running: 'bg-orange-500/15 text-orange-400',
}

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function greeting(now: Date) {
  const h = now.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function relativeDay(dateStr: string, now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${dateStr}T00:00:00`)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff > 1) return `En ${diff} días`
  if (diff === -1) return 'Ayer'
  return `Hace ${Math.abs(diff)} días`
}

function DashboardCard({
  index = 0,
  className,
  children,
}: {
  index?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/5 bg-surface-1 p-5 transition-colors hover:border-white/10',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

function MetricCard({
  index,
  title,
  value,
  display,
  icon: Icon,
  accent,
  trend,
  trendLabel,
  trendUp,
}: {
  index: number
  title: string
  value: number
  display: (n: number) => string
  icon: React.ElementType
  accent: string
  trend?: number
  trendLabel?: string
  trendUp?: boolean
}) {
  const animated = useCountUp(value)
  return (
    <DashboardCard index={index}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</p>
          <p className="text-2xl font-bold font-display text-white tabular-nums">{display(animated)}</p>
          {trend !== undefined || trendLabel ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {trendUp !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                    trendUp ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400',
                  )}
                >
                  {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {trend !== undefined ? `${trendUp ? '+' : ''}${trend}%` : null}
                </span>
              )}
              {trendLabel && <span className="text-[11px] text-white/30">{trendLabel}</span>}
            </div>
          ) : null}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', accent)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </DashboardCard>
  )
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/5', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full bg-gradient-to-r from-brand-primary/70 to-brand-primary"
      />
    </div>
  )
}

function formatCurrency(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

export default function CoachDashboard() {
  const m = MOCK_DASHBOARD_METRICS
  const extra = MOCK_DASHBOARD_EXTRA
  const now = useNow()
  const { events } = useEvents()
  const { products } = useProducts()
  const { sales, getAggregatedToday } = useSales()

  const [msgIndex, setMsgIndex] = useState(0)

  // Sales analytics
  const todayAggregated = getAggregatedToday()
  const todayRevenue = todayAggregated.reduce((sum, item) => sum + item.total, 0)
  const todayUnits = todayAggregated.reduce((sum, item) => sum + item.quantity, 0)

  // Last 7 days sales
  const todayStr = now.toISOString().split('T')[0]
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const salesByDay = last7Days.map((date) => {
    const daySales = sales.filter((s) => s.date === date)
    const total = daySales.reduce((sum, s) => sum + s.total, 0)
    const units = daySales.reduce((sum, s) => sum + s.quantity, 0)
    return { date, total, units, label: date ? new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }) : '' }
  })

  const maxDailySales = Math.max(1, ...salesByDay.map((d) => d.total))

  // Top products
  const productSales = useMemo(() => {
    const agg: Record<string, { name: string; brand?: string; qty: number; revenue: number; received: number }> = {}
    sales.forEach((s) => {
      const key = `${s.productId}|${s.productName}|${s.brand || ''}`
      if (!agg[key]) {
        agg[key] = { name: s.productName, brand: s.brand, qty: 0, revenue: 0, received: 0 }
      }
      agg[key].qty += s.quantity
      agg[key].revenue += s.total
      agg[key].received += s.unitReceived * s.quantity
    })
    return Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [sales])

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % extra.motivationalMessages.length), 6000)
    return () => clearInterval(id)
  }, [extra.motivationalMessages.length])

  const revenuePct = Math.min(100, Math.round((m.monthlyRevenue / extra.revenueGoal) * 100))
  const athletePct = Math.min(100, Math.round((m.newAthletesThisMonth / extra.newAthletesGoal) * 100))

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.date >= now.toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
  }, [events, now])

  const attention = useMemo(
    () => MOCK_ATHLETES.filter((a) => a.flag && a.flag.severity === 'high').slice(0, 4),
    [],
  )

  const maxRevenue = Math.max(...MOCK_REVENUE_HISTORY.map((r) => r.amount))

  const clock = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const dateLabel = now.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const ACTIVITY_ICON: Record<string, React.ElementType> = {
    user: UserPlus,
    event: Calendar,
    payment: CreditCard,
    trend: Trophy,
  }

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-surface-2 to-surface-1 p-6 sm:p-7"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-primary/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/icon/icon_mr.png"
                alt="MR Training"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-brand-primary/80">
                {clock} · {dateLabel}
              </p>
              <h1 className="mt-1.5 text-2xl font-bold font-display text-white sm:text-3xl">
                {greeting(now)}, Coach
              </h1>
              <div className="mt-2 h-6 overflow-hidden">
                <AnimatedMessage index={msgIndex} messages={extra.motivationalMessages} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="rounded-xl bg-orange-500/15 p-2 text-orange-400">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-xl font-bold font-display leading-none text-white tabular-nums">
                  {extra.streakDays}
                </p>
                <p className="text-[11px] text-white/40">días seguidos</p>
              </div>
            </div>
            <div className="hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex">
              <div className="rounded-xl bg-yellow-500/15 p-2 text-yellow-400">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-xl font-bold font-display leading-none text-white tabular-nums">
                  {extra.bestStreak}
                </p>
                <p className="text-[11px] text-white/40">mejor racha</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          index={0}
          title="Ingresos del mes"
          value={m.monthlyRevenue}
          display={formatCurrency}
          icon={DollarSign}
          trend={m.revenueTrend}
          trendLabel="vs mes ant."
          trendUp={m.revenueTrend > 0}
          accent="bg-emerald-500/20 text-emerald-400"
        />
        <MetricCard
          index={1}
          title="Atletas activos"
          value={m.activeAthletes}
          display={(n) => `${Math.round(n)}`}
          icon={Users}
          trend={m.athleteTrend}
          trendLabel="vs mes ant."
          trendUp={m.athleteTrend > 0}
          accent="bg-blue-500/20 text-blue-400"
        />
        <MetricCard
          index={2}
          title="Nuevos este mes"
          value={m.newAthletesThisMonth}
          display={(n) => `${Math.round(n)}`}
          icon={UserPlus}
          trend={m.newAthleteTrend}
          trendUp
          accent="bg-purple-500/20 text-purple-400"
        />
        <MetricCard
          index={3}
          title="Pagos pendientes"
          value={m.pendingPayments}
          display={formatCurrency}
          icon={AlertTriangle}
          trendLabel={`${m.pendingPaymentCount} pend., ${m.overduePaymentCount} venc.`}
          trendUp={false}
          accent="bg-amber-500/20 text-amber-400"
        />
      </div>

      {/* Goals + streaks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard index={0} className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
                <Target size={18} />
              </div>
              <h2 className="text-sm font-semibold text-white/80">Meta de ingresos mensual</h2>
            </div>
            <span className="text-2xl font-bold font-display text-white tabular-nums">
              {revenuePct}%
            </span>
          </div>
          <ProgressBar value={revenuePct} className="mt-4" />
          <p className="mt-3 text-xs text-white/40">
            {formatCurrency(m.monthlyRevenue)} de {formatCurrency(extra.revenueGoal)} ·{' '}
            <span className="text-brand-primary/90">te faltan {formatCurrency(extra.revenueGoal - m.monthlyRevenue)}</span>
          </p>
        </DashboardCard>

        <DashboardCard index={1}>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-purple-500/15 p-2 text-purple-400">
              <UserPlus size={18} />
            </div>
            <h2 className="text-sm font-semibold text-white/80">Crecimiento</h2>
          </div>
          <p className="mt-3 text-2xl font-bold font-display text-white tabular-nums">
            {m.newAthletesThisMonth}
            <span className="text-base font-normal text-white/30"> / {extra.newAthletesGoal}</span>
          </p>
          <ProgressBar value={athletePct} className="mt-3" />
          <p className="mt-2 text-xs text-white/40">nuevos atletas este mes</p>
        </DashboardCard>

        <DashboardCard index={2}>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-orange-500/15 p-2 text-orange-400">
              <Flame size={18} />
            </div>
            <h2 className="text-sm font-semibold text-white/80">Tu racha</h2>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <Zap size={20} className="text-orange-400" />
            <p className="text-2xl font-bold font-display text-white tabular-nums">{extra.streakDays}</p>
            <span className="text-xs text-white/40">días</span>
          </div>
          <p className="mt-2 text-xs text-white/40">
            ¡Sigue así! Récord: <span className="text-white/70">{extra.bestStreak} días</span>
          </p>
        </DashboardCard>
      </div>

      {/* Chart + events */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard index={0}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
                <DollarSign size={18} />
              </div>
              <h2 className="text-sm font-semibold text-white/80">Evolución de ingresos</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-400">
              <TrendingUp size={11} /> +{m.revenueTrend}%
            </span>
          </div>
          <div className="mt-5 flex items-end gap-2.5 h-36">
            {MOCK_REVENUE_HISTORY.map((r, i) => (
              <div key={r.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-white/30">
                  ${(r.amount / 1000).toFixed(1)}k
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(r.amount / maxRevenue) * 100}%` }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'w-full rounded-t-md bg-gradient-to-t from-brand-primary/50 to-brand-primary/90 transition-colors hover:from-brand-primary hover:to-brand-primary',
                    i === MOCK_REVENUE_HISTORY.length - 1 && 'ring-2 ring-brand-primary/40',
                  )}
                />
                <span className="text-[10px] text-white/40">{r.month}</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard index={1}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-blue-500/15 p-2 text-blue-400">
                <Calendar size={18} />
              </div>
              <h2 className="text-sm font-semibold text-white/80">Próximos eventos</h2>
            </div>
            <Link
              href="/coach/events"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary/90 hover:text-brand-primary"
            >
              Ver todos <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-white/40">No tienes eventos próximos.</p>
            )}
            {upcomingEvents.map((e: CoachEvent) => (
              <Link
                key={e.id}
                href="/coach/events"
                className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/90">{e.title}</p>
                  <p className="text-[11px] text-white/40">
                    {e.time} · {e.modality}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {e.format && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        FORMAT_STYLE[e.format],
                      )}
                    >
                      {FORMAT_LABEL[e.format]}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-brand-primary/90">
                    {relativeDay(e.date, now)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Attention + plan distribution */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard index={0}>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-red-500/15 p-2 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <h2 className="text-sm font-semibold text-white/80">Necesitan tu atención</h2>
          </div>
          <div className="mt-3 space-y-2">
            {attention.map((a) => (
              <Link
                key={a.id}
                href="/coach/users"
                className="flex items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 transition-colors hover:bg-red-500/[0.08]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 text-xs font-bold text-white">
                  {a.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/90">
                    {a.name} <span className="text-white/30">· {a.sport}</span>
                  </p>
                  <p className="truncate text-[11px] text-red-300/80">{a.flag?.message}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                  Alta
                </span>
              </Link>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard index={1}>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-purple-500/15 p-2 text-purple-400">
              <Users size={18} />
            </div>
            <h2 className="text-sm font-semibold text-white/80">Distribución por plan</h2>
          </div>
          <div className="mt-4 space-y-3">
            {extra.planDistribution.map((p) => {
              const pct = Math.round((p.athletes / m.activeAthletes) * 100)
              return (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-white/80">{p.name}</span>
                    <span className="text-white/40">
                      {p.athletes} atletas · ${p.revenue}/mes
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      className={cn('h-full rounded-full', p.color)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </DashboardCard>
      </div>

      {/* Sales performance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard index={0}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
                <ShoppingCart size={18} />
              </div>
              <h2 className="text-sm font-semibold text-white/80">Ventas hoy</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <TrendingUp size={11} /> +{todayUnits} uds
            </span>
          </div>
          <div className="mt-5 flex items-end gap-2 h-36">
            {salesByDay.map((d, i) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-white/30">
                  ${(d.total / 1000).toFixed(1)}k
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: maxDailySales > 0 ? `${(d.total / maxDailySales) * 100}%` : '0%' }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'w-full rounded-t-md bg-gradient-to-t from-emerald-500/50 to-emerald-500/90 transition-colors hover:from-emerald-500 hover:to-emerald-500',
                    d.date === todayStr && 'ring-2 ring-emerald-500/40',
                  )}
                />
                <span className="text-[10px] text-white/40">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-white/50">
            <span>Ingresos: <span className="text-white font-medium">{formatCurrency(todayRevenue)}</span></span>
            <span>Unidades: <span className="text-white font-medium">{todayUnits}</span></span>
          </div>
        </DashboardCard>

        <DashboardCard index={1}>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-sm font-semibold text-white/80">Top productos</h2>
          </div>
          <div className="mt-3 space-y-3">
            {productSales.length === 0 ? (
              <p className="text-xs text-white/40">Sin ventas registradas aún.</p>
            ) : (
              productSales.map((p, i) => (
                <div key={`${p.name}-${p.brand}`} className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-medium text-white/40 tabular-nums">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">
                      {p.name} {p.brand && <span className="text-white/30">· {p.brand}</span>}
                    </p>
                    <p className="text-[11px] text-white/40">{p.qty} uds · {formatCurrency(p.revenue)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-white/90 tabular-nums">{formatCurrency(p.received)}</p>
                    <p className="text-[10px] text-green-400/80 font-medium">
                      +{formatCurrency(p.received - (p.revenue * 0.3))} neto
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Activity feed */}
      <DashboardCard index={0}>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
            <Activity size={18} />
          </div>
          <h2 className="text-sm font-semibold text-white/80">Actividad reciente</h2>
          <span className="ml-1 flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            En vivo
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {extra.recentActivity.map((a) => {
            const Icon = ACTIVITY_ICON[a.icon] ?? Sparkles
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="rounded-lg bg-white/5 p-2 text-white/60">
                  <Icon size={15} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-white/80">{a.text}</p>
                <span className="shrink-0 text-[11px] text-white/30">{a.time}</span>
              </div>
            )
          })}
        </div>
      </DashboardCard>
    </div>
  )
}

function AnimatedMessage({ index, messages }: { index: number; messages: readonly string[] }) {
  return (
    <div className="relative">
      {messages.map((msg, i) => (
        <motion.p
          key={i}
          initial={false}
          animate={{
            opacity: i === index ? 1 : 0,
            y: i === index ? 0 : 8,
          }}
          transition={{ duration: 0.5 }}
          className={cn(
            'absolute inset-0 flex items-center gap-1.5 text-sm text-white/50',
            i === index ? 'relative' : 'pointer-events-none',
          )}
        >
          <Sparkles size={13} className="-mt-0.5 shrink-0 text-brand-primary/70" />
          {msg}
        </motion.p>
      ))}
    </div>
  )
}
