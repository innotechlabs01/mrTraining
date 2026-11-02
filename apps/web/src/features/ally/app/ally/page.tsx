/**
 * Ally Dashboard — Coach view of the Alianzas network.
 *
 * Entry point for the ally management dashboard. Shows a summary of:
 *   - Coach's allies (CRUD)
 *   • Ally catalog (products/services)
 *   • Operations (orders/reservations/redemptions)
 *   • Payment declarations & commissions
 *   • Settlements (monthly payouts)
 *
 * Data comes exclusively from the Go API (single source of truth).
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  listCoachAllies,
  listAllyOperations,
  listCoachCommissionEntries,
  listCoachSettlements,
  type Ally,
  type AllyOperation,
  type CommissionEntry,
  type CoachSettlement,
} from '../../services/allyService';

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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error loading dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Alianzas</h1>
        <p className="text-gray-500">Cargando dashboard de aliados…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Alianzas</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const totalAllies = allies.length;
  const totalOperations = operations.length;
  const totalCommissions = commissions.length;
  const totalSettlements = settlements.length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Alianzas — Red de Aliados</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Aliados</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAllies}</p>
          <p className="text-xs text-gray-400 mt-2">Red de aliados activos</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Operaciones</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOperations}</p>
          <p className="text-xs text-gray-400 mt-2">Órdenes, reservas y redenciones</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Comisiones</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCommissions}</p>
          <p className="text-xs text-gray-400 mt-2">Entradas de comisión pendientes</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Liquidaciones</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalSettlements}</p>
          <p className="text-xs text-gray-400 mt-2">Liquidaciones mensuales</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link href="/ally/allies" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Ver todos los aliados
        </Link>
        <Link href="/ally/catalog" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
          Catálogo productos/servicios
        </Link>
        <Link href="/ally/operations" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
          Ver operaciones
        </Link>
        <Link href="/ally/settlements" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
          Ver liquidaciones
        </Link>
      </div>

      {/* Allies list */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Aliados</h2>
        {allies.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="text-gray-500">No tienes aliados registrados aún.</p>
            <p className="text-sm text-gray-400 mt-2">Crea tu primer aliado para comenzar a operar en la red.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-sm font-semibold text-gray-500">Nombre comercial</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Categoría</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Estado</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Fecha de creación</th>
                </tr>
              </thead>
              <tbody>
                {allies.map((ally) => (
                  <tr key={ally.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">
                      <Link href={`/ally/allies/${ally.id}`} className="text-blue-600 hover:underline font-medium">
                        {ally.commercialName}
                      </Link>
                      <p className="text-sm text-gray-500">{ally.legalName}</p>
                    </td>
                    <td className="py-3">{ally.category}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ally.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {ally.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(ally.createdAt).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent operations */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Operaciones Recientes</h2>
        {operations.length === 0 ? (
          <p className="text-gray-500">No hay operaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-sm font-semibold text-gray-500">ID</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Tipo</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Estado</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Monto</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {operations.slice(0, 5).map((op) => (
                  <tr key={op.id} className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-500">{op.id}</td>
                    <td className="py-3">{op.type}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          op.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : op.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm">
                      ${(op.totalCents / 100).toFixed(2)} {op.currency}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
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
