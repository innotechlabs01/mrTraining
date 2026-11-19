'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { coachingApi } from '@/features/shared/api/client';
import { cn } from '@/lib/utils';

interface CommissionEntry {
  id: string;
  operation_id: string;
  relationship_id: string;
  coach_id: string;
  agreement_id: string;
  agreement_version: number;
  base_cents: number;
  rate_bps: number;
  fixed_amount_cents: number;
  amount_cents: number;
  currency: string;
  status: string;
  computed_at: string;
  created_at: string;
}

interface CommissionListResponse {
  data: CommissionEntry[];
  total: number;
  page: number;
  limit: number;
}

function formatMoney(cents: number, currency = 'COP'): string {
  const units = currency === 'COP' ? cents / 100 : cents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(units);
}

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    accrued: 'bg-green-500/10 text-green-400 border-green-500/20',
    reversed: 'bg-red-500/10 text-red-400 border-red-500/20',
    paid: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <Badge
      variant="outline"
      className={cn('text-xs px-2 py-1', variants[status] || variants.pending)}
    >
      {status}
    </Badge>
  );
}

export default function CommissionsPolicyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [configuring, setConfiguring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // ---- Fetch commissions ----
  const { data: commissions, isLoading, error, refetch } = useQuery<CommissionListResponse>({
    queryKey: ['commissions', page, limit],
    queryFn: () => coachingApi.listCommissions({ page, limit }),
    staleTime: 30 * 1000,
  });

  // ---- Configure commission mutation ----
  const configureMutation = useMutation({
    mutationFn: (data: {
      relationshipId: string;
      rateBps: number;
      fixedAmountCents: number;
      currency: string;
      validFrom: string;
    }) => coachingApi.configureCommission(data),
    onSuccess: () => {
      setConfiguring(false);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['commissions'] });
      void refetch();
      toast.success('Comisión configurada correctamente');
    },
    onError: (err: Error) => {
      setConfiguring(false);
      setFormError(err.message);
      toast.error('Error configurando la comisión');
    },
  });

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const form = e.currentTarget as HTMLFormElement;
    const relationshipId = (form.elements.namedItem('relationshipId') as HTMLInputElement).value;
    const rateBps = parseInt((form.elements.namedItem('rateBps') as HTMLInputElement).value, 10);
    const fixedAmountCents = parseInt((form.elements.namedItem('fixedAmountCents') as HTMLInputElement).value, 10) || 0;
    const currency = (form.elements.namedItem('currency') as HTMLSelectElement).value;
    const validFrom = (form.elements.namedItem('validFrom') as HTMLInputElement).value;

    if (!relationshipId) {
      setFormError('El ID de la relación es requerido');
      return;
    }
    if (rateBps < 0 || rateBps > 100000) {
      setFormError('La tasa debe estar entre 0 y 100000 puntos base');
      return;
    }
    if (!validFrom) {
      setFormError('La fecha de vigencia es requerida');
      return;
    }

    void configureMutation.mutate({
      relationshipId,
      rateBps,
      fixedAmountCents,
      currency,
      validFrom,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-display text-white">Comisiones</h1>
            <Button onClick={() => refetch()} className="flex items-center gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Actualizar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center py-20">
          <AlertCircle size={48} className="mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-white">Error cargando comisiones</h2>
          <p className="text-white/50 mt-2">{error.message}</p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw size={16} className="mr-2" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const entries = commissions?.data ?? [];
  const totalPages = Math.ceil((commissions?.total ?? 0) / limit) || 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Comisiones y Políticas</h1>
            <p className="text-white/50 text-sm">
              Configura tu tasa de comisión por relación y revisa el historial de entradas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => refetch()} className="flex items-center gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Actualizar
            </Button>
          </div>
        </div>

        {/* Configure Commission Form */}
        <Card className="border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={18} className="text-brand-primary" />
            <h2 className="text-sm font-semibold text-white">Configurar nueva comisión</h2>
          </div>
          <form onSubmit={handleConfigure} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40">Relación (coach → aliado)</label>
              <input
                name="relationshipId"
                type="text"
                placeholder="rel_abc123"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40">Tasa (puntos base)</label>
              <input
                name="rateBps"
                type="number"
                min="0"
                max="100000"
                placeholder="1000 = 10%"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40">Monto fijo (cents)</label>
              <input
                name="fixedAmountCents"
                type="number"
                min="0"
                placeholder="0"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40">Moneda</label>
              <select
                name="currency"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40">Vigencia desde</label>
              <input
                name="validFrom"
                type="datetime-local"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="submit"
                disabled={configuring}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {configuring ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Configurar
              </button>
            </div>
          </form>
          {formError && (
            <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
              {formError}
            </div>
          )}
        </Card>

        {/* Commission Entries List */}
        <Card className="border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Historial de comisiones</h2>
            <span className="text-xs text-white/40">{commissions?.total ?? 0} entrada(s)</span>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <EmptyState
                icon={<Plus size={24} className="text-white/30" aria-hidden="true" />}
                title="Sin comisiones registradas"
                description="Configura tu primera comisión usando el formulario de arriba."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Operación</th>
                    <th className="px-4 py-3">Relación</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Tasa</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-white/70">
                        {new Date(entry.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-white/70 truncate max-w-xs">{entry.operation_id}</td>
                      <td className="px-4 py-3 text-white/70 truncate max-w-xs">{entry.relationship_id}</td>
                      <td className="px-4 py-3 text-white tabular-nums text-right">
                        {formatMoney(entry.base_cents, entry.currency)}
                      </td>
                      <td className="px-4 py-3 text-white tabular-nums text-right">
                        {formatBps(entry.rate_bps)}
                      </td>
                      <td className="px-4 py-3 text-white tabular-nums text-right">
                        {entry.status === 'reversed' ? '-' : ''}{formatMoney(entry.amount_cents, entry.currency)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(entry.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {commissions && totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs text-white/50">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => {
                    router.replace(`/coach/polizas?page=${page - 1}&limit=${limit}`);
                  }}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    router.replace(`/coach/polizas?page=${page + 1}&limit=${limit}`);
                  }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
