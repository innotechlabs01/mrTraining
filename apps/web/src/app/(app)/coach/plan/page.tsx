'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentHistoryItem {
  id: string;
  reference?: string;
  amount_cents?: number;
  currency?: string;
  status: string;
  created_at?: string;
  plan_name?: string;
}

interface SubscriptionStatusResponse {
  status: string;
  reference?: string;
  plan_id?: string;
  plan_name?: string;
  trial_ends_at?: string;
  current_period_end?: string;
  payments?: PaymentHistoryItem[];
}

function getStatusBadge(status: string): {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
} {
  switch (status.toLowerCase()) {
    case 'active':
      return {
        label: 'Activa',
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
      };
    case 'trial':
      return {
        label: 'Prueba gratuita (7 días)',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: Clock,
      };
    case 'pending':
      return {
        label: 'Pendiente de pago',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: Clock,
      };
    case 'expired':
    case 'failed':
    case 'cancelled':
    case 'canceled':
    default:
      return {
        label: 'Vencida',
        className: 'bg-red-500/15 text-red-400 border-red-500/30',
        icon: AlertTriangle,
      };
  }
}

export default function CoachPlanPage() {
  const [data, setData] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/subscription/status', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo cargar el estado de tu membresía');
      }
      const json: SubscriptionStatusResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando tu membresía');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const status = (data?.status || 'none').toLowerCase();
  const badge = getStatusBadge(status);
  const BadgeIcon = badge.icon;
  const planId = data?.plan_id || 'coach-pro';
  const planName = data?.plan_name || 'Plan Coach';
  const checkoutHref = `/api/coach/subscription/checkout?planId=${encodeURIComponent(planId)}`;
  const payments = Array.isArray(data?.payments) ? data.payments : [];
  const isActive = status === 'active';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Mi Membresía</h1>
          <p className="text-sm text-white/50 mt-1">
            Administra tu suscripción de plataforma, renovaciones e historial de pagos
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/10 bg-surface-1 p-6 space-y-4 animate-pulse">
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="h-8 w-64 bg-white/10 rounded" />
          <div className="h-10 w-52 bg-white/10 rounded" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-red-300 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-medium text-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-surface-1 p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
                <CreditCard size={14} />
                Plan actual
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-white">{planName}</h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                    badge.className,
                  )}
                >
                  <BadgeIcon size={13} />
                  {badge.label}
                </span>
              </div>
              {data?.reference && (
                <p className="text-xs text-white/40 font-mono">
                  Referencia: {data.reference}
                </p>
              )}
            </div>

            <a
              href={checkoutHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold transition-colors"
            >
              <CreditCard size={16} />
              {isActive ? 'Renovar / Mejorar membresía' : 'Pagar / Renovar membresía'}
              <ExternalLink size={14} />
            </a>
          </div>

          {!isActive && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
              {status === 'trial'
                ? 'Estás en tu período de prueba gratuita de 7 días. Realiza el pago cuando quieras para mantener acceso continuo sin interrupciones.'
                : 'Tu membresía requiere pago o renovación para continuar usando todas las funciones de Coach OS.'}
            </div>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      <div className="rounded-xl border border-white/10 bg-surface-1 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-white/60" />
          <h2 className="text-lg font-semibold text-white">Historial de pagos</h2>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-8 text-center">
            <Receipt size={28} className="mx-auto text-white/20 mb-2" />
            <p className="text-sm text-white/60">No tienes pagos registrados aún.</p>
            <p className="text-xs text-white/40 mt-1">
              Cuando completes un pago con Wompi, aparecerá aquí tu comprobante.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase text-white/40">
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Referencia</th>
                  <th className="pb-3 pr-4">Monto</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 text-white/70">
                      {payment.created_at
                        ? new Date(payment.created_at).toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-white">
                      {payment.plan_name || planName}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-white/50">
                      {payment.reference || payment.id}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-white/80">
                      {payment.amount_cents != null
                        ? `$${Math.round(payment.amount_cents / 100).toLocaleString('es-CO')} ${payment.currency || 'COP'}`
                        : '—'}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
