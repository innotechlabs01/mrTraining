'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  max_athletes: number;
  max_sessions_per_week: number;
  is_active: boolean;
  athlete_count: number;
  coach_id: string;
  trm: number;
  created_at: string;
  updated_at: string;
  discount?: {
    type: string;
    value: number;
    label: string;
    from: string;
    until: string;
    code: string;
  } | null;
}

interface PlanFormValues {
  name: string;
  description: string;
  price: string;
  currency: 'COP' | 'USD';
  billing_period: string;
  max_athletes: string;
  max_sessions_per_week: string;
  is_active: boolean;
}

const DEFAULT_FORM: PlanFormValues = {
  name: '',
  description: '',
  price: '',
  currency: 'COP',
  billing_period: 'monthly',
  max_athletes: '10',
  max_sessions_per_week: '12',
  is_active: true,
};

export default function AdminPlansPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormValues>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const superAdminIds = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const isSuperAdmin = (!!user && superAdminIds.includes(user.id)) || metadataRole === 'super_admin';

  async function getAuthHeader(): Promise<{ [key: string]: string }> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    if (!user || !isSuperAdmin) {
      router.push('/coach');
      return;
    }
    loadPlans();
  }, [user, isSuperAdmin, router]);

  if (!user || !isSuperAdmin) {
    router.push('/coach');
    return null;
  }

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/v1/admin/plans', {
        headers: { Accept: 'application/json', ...headers },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`Error ${res.status}: ${body.error || body.message || 'No se pudieron cargar los planes'}`);
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.Data ?? data.data ?? [];
      setPlans(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        billing_period: form.billing_period,
        max_athletes: parseInt(form.max_athletes, 10) || 10,
        max_sessions_per_week: parseInt(form.max_sessions_per_week, 10) || 12,
        is_active: form.is_active,
      };

      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/admin/plans/${editing.id}` : '/api/v1/admin/plans';

      const authHeaders = await getAuthHeader();
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Error ${res.status}`);
      }

      setMessage({ text: editing ? 'Plan actualizado correctamente' : 'Plan creado correctamente', type: 'success' });
      setOpen(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setError(null);
    setMessage(null);
    setOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      price: String(plan.price),
      currency: plan.currency as 'COP' | 'USD',
      billing_period: plan.billing_period,
      max_athletes: String(plan.max_athletes),
      max_sessions_per_week: String(plan.max_sessions_per_week),
      is_active: plan.is_active,
    });
    setError(null);
    setMessage(null);
    setOpen(true);
  }

  async function deletePlan(id: string) {
    if (!window.confirm('¿Eliminar este plan? Esta acción no se puede deshacer.')) return;
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`/api/v1/admin/plans/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('No se pudo eliminar el plan');
      await loadPlans();
      setMessage({ text: 'Plan eliminado correctamente', type: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  const statusBadge = (active: boolean) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${active ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary animate-pulse">Planes</h1>
            <p className="text-text-secondary mt-1 animate-pulse">Cargando planes...</p>
          </div>
        </div>
        <div className="rounded-xl border border-surface-6 bg-surface-1 overflow-hidden">
          <div className="p-4 border-b border-surface-6">
            <div className="h-4 bg-surface-2 rounded w-1/3 animate-pulse" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-6">
                  {[['Nombre', 'Descripción', 'Precio', 'Periodo', 'Atletas', 'Estado', 'Acciones']].map((h, i) => (
                    <th key={i} className="p-3 text-text-secondary text-left">
                      <div className="h-4 bg-surface-2 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((row) => (
                  <tr key={row} className="border-b border-surface-1">
                    <td className="p-3"><div className="h-4 bg-surface-2 rounded w-3/4 animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 bg-surface-2 rounded w-2/3 animate-pulse" /></td>
                    <td className="p-3 text-right"><div className="h-4 bg-surface-2 rounded w-1/2 animate-pulse" /></td>
                    <td className="p-3 text-center"><div className="h-4 bg-surface-2 rounded w-1/3 animate-pulse" /></td>
                    <td className="p-3 text-center"><div className="h-4 bg-surface-2 rounded w-1/4 animate-pulse" /></td>
                    <td className="p-3 text-center"><div className="h-4 bg-surface-2 rounded w-1/3 animate-pulse" /></td>
                    <td className="p-3 text-right"><div className="h-4 bg-surface-2 rounded w-1/3 animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Planes</h1>
          <p className="text-text-secondary mt-1">
            Gestión de planes de suscripción: costos, periodos y disponibilidad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-text-inverse text-sm font-medium hover:bg-brand-primary/90 transition-colors"
          >
            <Plus size={16} /> Nuevo Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error/10 text-error border border-error/20">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 rounded-lg bg-success/10 text-success border border-success/20">
          {message.text}
        </div>
      )}

      {/* Plans table */}
      <div className="rounded-xl border border-surface-6 bg-surface-1 overflow-hidden">
        <div className="p-4 border-b border-surface-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Planes disponibles</h2>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Buscar plan..."
              className="w-64 pl-10 pr-4 py-2 rounded-lg bg-surface-2 border border-surface-3 text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary text-sm"
            />
            <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-6 text-text-secondary text-left">
                <th className="p-3">Nombre</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-center">Periodo</th>
                <th className="p-3 text-center">Atletas</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-text-secondary text-center">
                    No hay planes registrados.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-surface-1 hover:bg-surface-2 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-text-secondary shrink-0" />
                        <div>
                          <div className="font-medium text-text-primary">{plan.name}</div>
                          <div className="text-xs text-text-secondary">ID: {plan.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-text-secondary">
                      {plan.description || '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-text-primary">
                      {plan.currency === 'USD'
                        ? `$${plan.price.toLocaleString()} USD`
                        : `$${plan.price.toLocaleString()} COP`}
                      {plan.trm && plan.currency === 'USD' ? (
                        <span className="text-xs text-text-secondary ml-1">
                          (TRM {plan.trm.toLocaleString()} | +15%: ${(plan.trm * 1.15).toLocaleString()})
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-center text-text-secondary">{plan.billing_period}</td>
                    <td className="p-3 text-center text-text-secondary">{plan.max_athletes}</td>
                    <td className="p-3 text-center">{statusBadge(plan.is_active)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(plan)}
                          className="p-2 rounded-lg text-text-secondary hover:text-brand-primary hover:bg-brand-primary/5 transition-colors"
                          aria-label={`Editar ${plan.name}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
                          aria-label={`Eliminar ${plan.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal (only mounted when open, so the backdrop never blocks the table) */}
      {open && (
        <div className="fixed inset-0 z-50" aria-hidden="true">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md mx-0 -translate-x-1/2 -translate-y-1/2 bg-surface-1 rounded-xl border border-surface-6 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">
                {editing ? 'Editar plan' : 'Crear plan'}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nombre del plan</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Plan Starter"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div className="mb-4 md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Descripción</label>
                  <input
                    name="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Qué incluye el plan"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Precio</label>
                  <div className="flex items-center gap-2">
                    <input
                      name="price"
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0"
                      className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                    <select
                      name="currency"
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value as 'COP' | 'USD' })}
                      className="bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Periodo de facturación</label>
                  <select
                    name="billing_period"
                    value={form.billing_period}
                    onChange={(e) => setForm({ ...form, billing_period: e.target.value })}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Máx. atletas</label>
                  <input
                    name="max_athletes"
                    type="number"
                    value={form.max_athletes}
                    onChange={(e) => setForm({ ...form, max_athletes: e.target.value })}
                    placeholder="10"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Máx. sesiones/semana</label>
                  <input
                    name="max_sessions_per_week"
                    type="number"
                    value={form.max_sessions_per_week}
                    onChange={(e) => setForm({ ...form, max_sessions_per_week: e.target.value })}
                    placeholder="12"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded bg-surface-2 border-surface-3 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-sm text-text-secondary">Plan activo (visible para coaches y atletas)</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-end sm:justify-end gap-3 sm:gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors sm:flex-1 sm:max-w-[140px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand-primary text-text-inverse text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:flex-1 sm:max-w-[180px]"
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear plan'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        {message && (
          <div className={cn(
            'px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium',
            message.type === 'success' ? 'bg-success/90 text-success border border-success/20' : 'bg-error/90 text-error border border-error/20',
          )}>
            <Eye size={16} />
            {message.text}
          </div>
        )}
      </motion.div>
    </div>
  );
}
