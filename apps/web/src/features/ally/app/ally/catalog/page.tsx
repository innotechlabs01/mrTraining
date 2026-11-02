/**
 * Ally Catalog — View products and services offered by allies.
 * Coach can browse the ally catalog (products/services published by allies).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listAllyProducts, listAllyServices, type AllyProduct } from '../../../services/allyService';

export default function AllyCatalogPage() {
  const [products, setProducts] = useState<AllyProduct[]>([]);
  const [services, setServices] = useState<AllyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAllyProducts().catch(() => [] as AllyProduct[]),
      listAllyServices().catch(() => [] as AllyProduct[]),
    ])
      .then(([productsData, servicesData]) => {
        if (!cancelled) {
          setProducts(productsData);
          setServices(servicesData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error loading catalog');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Aliados</h1>
        <p className="text-gray-500">Cargando catálogo…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Aliados</h1>
        <p className="text-red-500">{error}</p>
        <Link href="/ally" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Volver al dashboard
        </Link>
      </div>
    );
  }

  const formatPrice = (cents: number, currency: string) =>
    `$${(cents / 100).toFixed(2)} ${currency}`;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos y Servicios</h1>
          <p className="text-gray-500 mt-1">Explora el catálogo de productos y servicios de tus aliados</p>
        </div>
        <Link
          href="/ally"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          ← Volver al dashboard
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Products */}
      {products.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Productos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{p.description}</p>
                <div className="mt-auto">
                  <span className="text-lg font-bold text-blue-600">{formatPrice(p.priceCents, p.currency)}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Servicios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-gray-900">{s.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{s.description}</p>
                <div className="mt-auto">
                  <span className="text-lg font-bold text-blue-600">{formatPrice(s.priceCents, s.currency)}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {s.durationMin} min · Capacidad: {s.capacity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && services.length === 0 && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-500">No hay productos ni servicios en el catálogo.</p>
        </div>
      )}
    </div>
  );
}
