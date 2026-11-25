'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DollarSign, ShoppingCart, Users, Clock, TrendingUp, Landmark, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useEarnings } from '@/features/coach/hooks/useEarnings'
import { subscribeEarningsLive } from '@/features/shared/api/client'
import { goFetch } from '@/lib/api/go-client'
import { formatMoney } from '@/lib/utils'

interface PayoutAccountForm {
  bank_name: string
  account_type: 'savings' | 'checking' | 'nequi' | 'daviplata'
  account_number: string
  account_holder_name: string
  document_type: 'CC' | 'NIT' | 'CE' | 'PAS'
  document_number: string
}

const DEFAULT_PAYOUT_ACCOUNT: PayoutAccountForm = {
  bank_name: '',
  account_type: 'savings',
  account_number: '',
  account_holder_name: '',
  document_type: 'CC',
  document_number: '',
}

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

      {/* Cuenta bancaria para pagos */}
      <PayoutAccountCard />

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
            Total: <span className="font-bold text-white">{formatMoney(totalEarnings)}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function PayoutAccountCard() {
  const [form, setForm] = useState<PayoutAccountForm>(DEFAULT_PAYOUT_ACCOUNT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    goFetch<Partial<PayoutAccountForm> | { data?: Partial<PayoutAccountForm> }>(
      '/api/v1/coach/payout-account',
    )
      .then((res) => {
        if (!active || !res) return
        const data = 'data' in res && res.data ? res.data : (res as Partial<PayoutAccountForm>)
        setForm({
          bank_name: data.bank_name ?? '',
          account_type: (data.account_type as PayoutAccountForm['account_type']) ?? 'savings',
          account_number: data.account_number ?? '',
          account_holder_name: data.account_holder_name ?? '',
          document_type: (data.document_type as PayoutAccountForm['document_type']) ?? 'CC',
          document_number: data.document_number ?? '',
        })
      })
      .catch(() => {
        // Account may not be configured yet; leave empty defaults
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_holder_name.trim() || !form.document_number.trim()) {
      toast.error('Por favor completa todos los campos obligatorios.')
      return
    }
    setSaving(true)
    try {
      await goFetch('/api/v1/coach/payout-account', {
        method: 'PUT',
        body: JSON.stringify({
          bank_name: form.bank_name.trim(),
          account_type: form.account_type,
          account_number: form.account_number.trim(),
          account_holder_name: form.account_holder_name.trim(),
          document_type: form.document_type,
          document_number: form.document_number.trim(),
        }),
      })
      toast.success('Cuenta bancaria guardada correctamente.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la cuenta bancaria.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary'

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Landmark size={18} className="text-brand-primary" />
        <h2 className="text-base font-semibold text-white">Cuenta bancaria para pagos</h2>
      </div>
      <p className="text-xs text-white/50 mb-5">
        Configura la cuenta donde recibirás tus liquidaciones y comisiones.
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-10 bg-white/10 rounded-lg" />
          <div className="h-10 bg-white/10 rounded-lg" />
          <div className="h-10 bg-white/10 rounded-lg" />
          <div className="h-10 bg-white/10 rounded-lg" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="payout-bank-name" className="block text-xs font-medium text-white/70 mb-1.5">
                Banco
              </label>
              <input
                id="payout-bank-name"
                type="text"
                required
                value={form.bank_name}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                placeholder="Ej. Bancolombia, Davivienda, Nequi"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="payout-account-type" className="block text-xs font-medium text-white/70 mb-1.5">
                Tipo de cuenta
              </label>
              <select
                id="payout-account-type"
                value={form.account_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    account_type: e.target.value as PayoutAccountForm['account_type'],
                  }))
                }
                className={inputClass}
              >
                <option value="savings" className="bg-neutral-900">Ahorros</option>
                <option value="checking" className="bg-neutral-900">Corriente</option>
                <option value="nequi" className="bg-neutral-900">Nequi</option>
                <option value="daviplata" className="bg-neutral-900">Daviplata</option>
              </select>
            </div>

            <div>
              <label htmlFor="payout-account-number" className="block text-xs font-medium text-white/70 mb-1.5">
                Número de cuenta
              </label>
              <input
                id="payout-account-number"
                type="text"
                required
                value={form.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                placeholder="Número de cuenta o celular"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="payout-account-holder" className="block text-xs font-medium text-white/70 mb-1.5">
                Titular
              </label>
              <input
                id="payout-account-holder"
                type="text"
                required
                value={form.account_holder_name}
                onChange={(e) => setForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                placeholder="Nombre completo del titular"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="payout-doc-type" className="block text-xs font-medium text-white/70 mb-1.5">
                Tipo de documento
              </label>
              <select
                id="payout-doc-type"
                value={form.document_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    document_type: e.target.value as PayoutAccountForm['document_type'],
                  }))
                }
                className={inputClass}
              >
                <option value="CC" className="bg-neutral-900">CC</option>
                <option value="NIT" className="bg-neutral-900">NIT</option>
                <option value="CE" className="bg-neutral-900">CE</option>
                <option value="PAS" className="bg-neutral-900">PAS</option>
              </select>
            </div>

            <div>
              <label htmlFor="payout-doc-number" className="block text-xs font-medium text-white/70 mb-1.5">
                Número de documento
              </label>
              <input
                id="payout-doc-number"
                type="text"
                required
                value={form.document_number}
                onChange={(e) => setForm((prev) => ({ ...prev, document_number: e.target.value }))}
                placeholder="Ej. 1020304050"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cuenta bancaria'}
            </button>
          </div>
        </form>
      )}
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
