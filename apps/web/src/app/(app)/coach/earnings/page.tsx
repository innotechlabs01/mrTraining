'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DollarSign, ShoppingCart, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { useEarnings } from '@/features/coach/hooks/useEarnings'
import { subscribeEarningsLive } from '@/features/shared/api/client'
import { formatMoney } from '@/lib/utils'

export default function CoachEarningsPage() {
  const {
    earnings,
    isLoading,
    totalEarnings,
    ownProfit,
    commissionTotal,
    pending,
    ownSalesTotal,
    ownSalesCount,
    commissionCount,
    byAlly,
    refresh,
  } = useEarnings()

  const [liveNotification, setLiveNotification] = useState<{
    allyName?: string
    amountCents: number
    currency: string
  } | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])

  // SSE: escuchar comisiones nuevas en tiempo real
  useEffect(() => {
    const unsub = subscribeEarningsLive((ev: { type: string; payload: Record<string, unknown> }) => {
      if (ev.type === 'earnings.new_commission') {
        const payload = ev.payload as Record<string, unknown>
        setLiveNotification({
          amountCents: Number(payload.amount_cents ?? 0),
          currency: String(payload.currency ?? 'COP'),
        })
        // Refrescar métricas para mostrar los nuevos totales
        void refresh()
      }
    })
    return () => unsub()
  }, [refresh])

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Ganancias del Coach</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-white/10 rounded" />
          <div className="h-8 w-1/2 bg-white/10 rounded" />
          <div className="h-64 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ganancias del Coach</h1>
          <p className="text-sm text-white/50">
            Resumen de ventas propias y comisiones de aliados
          </p>
        </div>
        <Link
          href="/coach/ventas"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/90 transition-colors"
        >
          <ShoppingCart size={16} /> Ver mis ventas
        </Link>
      </div>

      {/* Notificación de comisión nueva en tiempo real */}
      {liveNotification && (
        <div
          className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 mb-6 animate-pulse"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Nueva comisión generada
              </p>
              <p className="text-sm text-white">
                {formatMoney(liveNotification.amountCents)} (
                {liveNotification.currency})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ganancias totales"
          value={formatMoney(totalEarnings)}
          icon={<DollarSign size={20} />}
          accent="bg-green-500/20 text-green-400"
        />
        <MetricCard
          title="Ventas propias"
          value={formatMoney(ownSalesTotal)}
          subtitle={`${ownSalesCount} ventas`}
          icon={<ShoppingCart size={20} />}
          accent="bg-blue-500/20 text-blue-400"
        />
        <MetricCard
          title="Comisiones de aliados"
          value={formatMoney(commissionTotal)}
          subtitle={`${commissionCount} comisiones`}
          icon={<Users size={20} />}
          accent="bg-indigo-500/20 text-indigo-400"
        />
        <MetricCard
          title="Pendiente de cobro"
          value={formatMoney(pending)}
          subtitle="Comisiones no liquidadas"
          icon={<Clock size={20} />}
          accent="bg-orange-500/20 text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detalle: beneficio de ventas propias */}
        <div className="col-span-1 lg:col-span-1">
          <Card title="Beneficio de ventas propias" icon={<ShoppingCart size={20} />}>
            <div className="text-3xl font-bold text-white">{formatMoney(ownProfit)}</div>
            <p className="text-sm text-white/50 mt-1">
              Precio de venta menos precio de costo
            </p>
          </Card>
        </div>

        {/* Detalle: comisiones */}
        <div className="col-span-1 lg:col-span-1">
          <Card title="Comisiones generadas" icon={<Users size={20} />}>
            <div className="text-3xl font-bold text-white">{formatMoney(commissionTotal)}</div>
            <p className="text-sm text-white/50 mt-1">
              Por operaciones de aliados liquidadas
            </p>
          </Card>
        </div>

        {/* Desglose por aliado */}
        <div className="lg:col-span-1">
          <Card title="Por aliado" icon={<TrendingUp size={20} />}>
            {byAlly.length === 0 ? (
              <div className="py-4 text-center text-white/50 text-sm">
                Sin comisiones de aliados aún
              </div>
            ) : (
              <ul className="space-y-3">
                {byAlly.map((ally) => (
                  <li key={ally.allyId} className="flex items-center justify-between pb-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm text-white">{ally.allyName || 'Aliado'}</p>
                      <p className="text-xs text-white/50">
                        {ally.commissionCount} comisión(es)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        {formatMoney(ally.commissionCents / 100)}
                      </p>
                      {ally.pendingCents > 0 && (
                        <p className="text-xs text-orange-400">
                          Pendiente: {formatMoney(ally.pendingCents / 100)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-6 border border-white/5">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
          ¿Cómo se calcula?
        </h3>
        <ul className="space-y-2 text-sm text-white/60">
          <li>
            <span className="text-green-400 font-bold">+</span> {'Ventas propias: '}
            <span className="font-mono">{formatMoney(ownSalesTotal)}</span>{' '}
            de ingresos, beneficio de{' '}
            <span className="font-mono">{formatMoney(ownProfit)}</span>
          </li>
          <li>
            <span className="text-indigo-400 font-bold">+</span> {'Comisiones de aliados: '}
            <span className="font-mono">{formatMoney(commissionTotal)}</span>
          </li>
          <li>
            <span className="text-orange-400 font-bold">⚠</span> {'Pendiente de cobro: '}
            <span className="font-mono">{formatMoney(pending)}</span>{' '}
            (comisiones generadas pero aún no liquidadas en un settlement)
          </li>
          <li>
            {'Total: <span className="font-bold text-white">{formatMoney(totalEarnings)}</span>'}
          </li>
        </ul>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className={accent + ' rounded-xl p-4'}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60 uppercase tracking-wider">{title}</p>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
        </div>
        <span className="text-white/30">{icon}</span>
      </div>
    </div>
  )
}

function Card({
  children,
  title,
  icon,
}: {
  children: React.ReactNode
  title: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white/5 rounded-xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white/50">{icon}</span>
        <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}
