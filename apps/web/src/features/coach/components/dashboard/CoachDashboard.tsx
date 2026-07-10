'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  UserPlus,
  AlertCircle,
  Calendar,
  Dumbbell,
} from 'lucide-react'
import { MOCK_DASHBOARD_METRICS, MOCK_REVENUE_HISTORY } from '../../data/_mocks'

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendUp,
  accent,
}: {
  title: string
  value: string
  icon: React.ElementType
  trend?: number
  trendLabel?: string
  trendUp?: boolean
  accent: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface-1 p-5"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white font-display">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5">
              {trendUp ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              <span className={`text-xs font-medium ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {trendUp ? '+' : ''}{trend}%
              </span>
              {trendLabel && <span className="text-xs text-white/30">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${accent}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </motion.div>
  )
}

export default function CoachDashboard() {
  const m = MOCK_DASHBOARD_METRICS
  const maxRevenue = Math.max(...MOCK_REVENUE_HISTORY.map((r) => r.amount))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Resumen general de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos del Mes"
          value={`$${m.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={m.revenueTrend}
          trendLabel="vs mes anterior"
          trendUp={m.revenueTrend > 0}
          accent="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          title="Atletas Activos"
          value={String(m.activeAthletes)}
          icon={Users}
          trend={m.athleteTrend}
          trendLabel="vs mes anterior"
          trendUp={m.athleteTrend > 0}
          accent="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          title="Nuevos este Mes"
          value={String(m.newAthletesThisMonth)}
          icon={UserPlus}
          trend={m.newAthleteTrend}
          trendUp
          accent="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          title="Pagos Pendientes"
          value={`$${m.pendingPayments.toLocaleString()}`}
          icon={AlertCircle}
          trendLabel={`${m.pendingPaymentCount} pendientes, ${m.overduePaymentCount} vencidos`}
          trendUp={false}
          accent="bg-amber-500/20 text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-surface-1 p-5">
          <h2 className="text-sm font-semibold text-white/70 mb-4">Historial de Ingresos</h2>
          <div className="flex items-end gap-3 h-40">
            {MOCK_REVENUE_HISTORY.map((r) => (
              <div key={r.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-white/30 font-medium">
                  ${(r.amount / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-primary/60 to-brand-primary/30 transition-all hover:from-brand-primary hover:to-brand-primary/60"
                  style={{ height: `${(r.amount / maxRevenue) * 100}%` }}
                />
                <span className="text-[10px] text-white/40">{r.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white/70">Hoy</h2>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <Dumbbell size={16} />
            </div>
            <div>
              <p className="text-sm text-white/80 font-medium">Sesiones</p>
              <p className="text-xs text-white/40">
                {m.todaySessionsCompleted}/{m.todaySessions} completadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-sm text-white/80 font-medium">Eventos Próximos</p>
              <p className="text-xs text-white/40">{m.upcomingEvents} esta semana</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-sm text-white/80 font-medium">Atención</p>
              <p className="text-xs text-white/40">{m.overduePaymentCount} pagos vencidos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-white/70 mb-3">Distribución por Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-white/40 mb-1">Starter</p>
            <p className="text-lg font-bold text-white font-display">8 atletas</p>
            <p className="text-xs text-white/30 mt-1">$392/mes</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-white/40 mb-1">Pro</p>
            <p className="text-lg font-bold text-white font-display">12 atletas</p>
            <p className="text-xs text-white/30 mt-1">$1,188/mes</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-white/40 mb-1">Elite</p>
            <p className="text-lg font-bold text-white font-display">4 atletas</p>
            <p className="text-xs text-white/30 mt-1">$796/mes</p>
          </div>
        </div>
      </div>
    </div>
  )
}
