'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Store, Activity, DollarSign, FileCheck2, ArrowRight, PlusCircle } from 'lucide-react';
import {
  listCoachAllies,
  listAllyOperations,
  listCoachCommissionEntries,
  listCoachSettlements,
  type Ally,
  type AllyOperation,
  type CommissionEntry,
  type CoachSettlement,
} from '@/features/ally/services/allyService';

export default function AllyDashboard() {
  const [allies, setAllies] = useState<Ally[]>([]);
  const [operations, setOperations] = useState<AllyOperation[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [settlements, setSettlements] = useState<CoachSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [alliesData, opsData, commData, settData] = await Promise.all([
          listCoachAllies().catch(() => [] as Ally[]),
          listAllyOperations().catch(() => [] as AllyOperation[]),
          listCoachCommissionEntries().catch(() => [] as CommissionEntry[]),
          listCoachSettlements().catch(() => [] as CoachSettlement[]),
        ]);
        if (!cancelled) {
          setAllies(alliesData);
          setOperations(opsData);
          setCommissions(commData);
          setSettlements(settData);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando aliados');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-white">Alianzas — Red de Aliados</h1>
        <p className="text-sm text-white/40 mt-2">Cargando dashboard de aliados…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-white">Alianzas — Red de Aliados</h1>
        <p className="text-sm text-red-400 mt-2">{error}</p>
      </div>
    );
  }

  const totalAllies = allies.length;
  const totalOperations = operations.length;
  const totalCommissions = commissions.length;
  const totalSettlements = settlements.length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Alianzas — Red de Aliados</h1>
          <p className="text-sm text-white/40 mt-1">
            Gestiona aliados comerciales, catálogo visible en la app mobile, comisiones y redenciones QR
          </p>
        </div>
        <Link
          href="/coach/ally/allies"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <PlusCircle size={16} />
          Gestionar Aliados
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
          <div className="flex items-center justify-between text-white/50 text-xs uppercase tracking-wider">
            <span>Aliados</span>
            <Store size={16} className="text-brand-primary" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">{totalAllies}</p>
          <p className="text-xs text-white/40 mt-1">Red de aliados activos</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
          <div className="flex items-center justify-between text-white/50 text-xs uppercase tracking-wider">
            <span>Operaciones</span>
            <Activity size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">{totalOperations}</p>
          <p className="text-xs text-white/40 mt-1">Órdenes, reservas y redenciones</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
          <div className="flex items-center justify-between text-white/50 text-xs uppercase tracking-wider">
            <span>Comisiones</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">{totalCommissions}</p>
          <p className="text-xs text-white/40 mt-1">Entradas de comisión registradas</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-1 p-5">
          <div className="flex items-center justify-between text-white/50 text-xs uppercase tracking-wider">
            <span>Liquidaciones</span>
            <FileCheck2 size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">{totalSettlements}</p>
          <p className="text-xs text-white/40 mt-1">Liquidaciones mensuales</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/coach/ally/allies"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          Ver todos los aliados <ArrowRight size={14} />
        </Link>
        <Link
          href="/coach/ally/catalog"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Catálogo productos/servicios
        </Link>
        <Link
          href="/coach/ally/operations"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Ver operaciones
        </Link>
        <Link
          href="/coach/ally/settlements"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Liquidaciones y pagos
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-surface-1 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Mis Aliados</h2>
        {allies.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/60">No tienes aliados registrados aún.</p>
            <p className="text-xs text-white/40 mt-1">Crea tu primer aliado para habilitar beneficios en la tienda mobile.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Nombre comercial</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Nombre legal</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Categoría</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Estado</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {allies.map((ally) => (
                  <tr key={ally.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3">
                      <Link href={`/coach/ally/allies/${ally.id}`} className="text-brand-primary hover:underline text-sm font-medium">
                        {ally.commercialName}
                      </Link>
                    </td>
                    <td className="py-3 text-sm text-white/60">{ally.legalName}</td>
                    <td className="py-3 text-sm text-white/70">{ally.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ally.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : ally.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                      }`}>
                        {ally.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-white/50">
                      {new Date(ally.createdAt).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-surface-1 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Operaciones Recientes</h2>
        {operations.length === 0 ? (
          <p className="text-sm text-white/40">No hay operaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">ID</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Tipo</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Estado</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Monto</th>
                  <th className="pb-3 text-xs font-semibold text-white/50 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {operations.slice(0, 5).map((op) => (
                  <tr key={op.id} className="border-b border-white/5">
                    <td className="py-3 text-xs font-mono text-white/50">{op.id}</td>
                    <td className="py-3 text-sm text-white/80">{op.type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        op.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : op.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                      }`}>
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-white/80 tabular-nums">{formatPrice(op.totalCents, op.currency)}</td>
                    <td className="py-3 text-sm text-white/50">
                      {new Date(op.createdAt).toLocaleDateString('es-ES')}
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

function formatPrice(cents: number, currency: string): string {
  return `$${(cents / 100).toFixed(2)} ${currency}`;
}
