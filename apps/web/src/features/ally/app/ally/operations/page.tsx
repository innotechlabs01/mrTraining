/**
 * Ally Operations — View orders, reservations, and redemptions.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listAllyOperations, type AllyOperation } from '../../../services/allyService';

function getStatusClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-red-100 text-red-700';
  }
}

function formatPrice(cents: number, currency: string): string {
  return `$${(cents / 100).toFixed(2)} ${currency}`;
}

export default function AllyOperationsPage() {
  const [operations, setOperations] = useState<AllyOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAllyOperations()
      .then((data) => {
        if (!cancelled) setOperations(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error loading operations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones</h1>
        <p className="text-gray-500">Cargando operaciones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones</h1>
        <p className="text-red-500">{error}</p>
        <Link href="/ally" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Operaciones</h1>
      <p className="text-gray-500 mb-6">
        Órdenes, reservas y redenciones de aliados
      </p>
      <Link href="/ally" className="text-blue-600 hover:underline mb-6 inline-block">
        ← Volver al dashboard
      </Link>

      {operations.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-500">No hay operaciones registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
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
              {operations.map((op) => (
                <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-500">{op.id}</td>
                  <td className="py-3">{op.type}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(op.status)}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm">{formatPrice(op.totalCents, op.currency)}</td>
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
  );
}
