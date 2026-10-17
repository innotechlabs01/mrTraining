'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCoachAllies, createAlly, type Ally, type CreateAllyRequest } from '@/features/ally/services/allyService';

function getStatusClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-red-100 text-red-700';
  }
}

export default function AlliesPage() {
  const [allies, setAllies] = useState<Ally[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateAllyRequest>({
    legalName: '',
    commercialName: '',
    category: '',
    contactEmail: '',
    contactPhone: '',
    taxId: '',
  });

  useEffect(() => {
    let cancelled = false;
    listCoachAllies()
      .then((data) => {
        if (!cancelled) setAllies(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error loading allies');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAlly(formData);
      setFormData({
        legalName: '',
        commercialName: '',
        category: '',
        contactEmail: '',
        contactPhone: '',
        taxId: '',
      });
      const updated = await listCoachAllies();
      setAllies(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating ally');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Aliados</h1>
        <p className="text-gray-500">Cargando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Aliados</h1>
        <p className="text-red-500">{error}</p>
        <Link href="/coach/ally" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Aliados</h1>
          <p className="text-gray-500 mt-1">Gestiona tu red de aliados estratégicos</p>
        </div>
        <Link
          href="/coach/ally"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          ← Volver al dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Registrar nuevo aliado</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Nombre legal</label>
            <input
              name="legalName"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ej: Comercio Alimentos SAS"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Nombre comercial</label>
            <input
              name="commercialName"
              value={formData.commercialName}
              onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ej: Alimentos el Buen Sabor"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <input
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ej: Alimentación, Transporte, etc."
              required
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Email de contacto</label>
            <input
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="contacto@ejemplo.com"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Teléfono de contacto</label>
            <input
              name="contactPhone"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="+57 300 000 0000"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">NIT / Cédula</label>
            <input
              name="taxId"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="900.123.456-7"
            />
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {creating ? 'Creando…' : 'Registrar aliado'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 p-6 border-b border-gray-200">
          Lista de Aliados ({allies.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-sm font-semibold text-gray-500">Nombre comercial</th>
                <th className="pb-3 text-sm font-semibold text-gray-500">Nombre legal</th>
                <th className="pb-3 text-sm font-semibold text-gray-500">Categoría</th>
                <th className="pb-3 text-sm font-semibold text-gray-500">Estado</th>
                <th className="pb-3 text-sm font-semibold text-gray-500">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {allies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No hay aliados registrados.
                  </td>
                </tr>
              ) : (
                allies.map((ally: Ally) => (
                  <tr key={ally.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">
                      <Link href={`/coach/ally/allies/${ally.id}`} className="text-blue-600 hover:underline font-medium">
                        {ally.commercialName}
                      </Link>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{ally.legalName}</td>
                    <td className="py-3 text-sm">{ally.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(ally.status)}`}>
                        {ally.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(ally.createdAt).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}