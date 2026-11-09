'use client';

import { useEffect, useState } from 'react';
import { useSession, useUser } from '@clerk/nextjs';
import {
  Plus, Trash2, Save, DollarSign, User, Settings, Play, Clock,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

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
}

export default function CoachPlansPage() {
  const { user } = useUser();
  const { session } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'COP',
    billing_period: 'monthly',
    max_athletes: '10',
    max_sessions_per_week: '3',
    is_active: 'true',
  });

  const coachId = user?.id;

  async function getToken() {
    if (!session) return null;
    return session.getToken();
  }

  useEffect(() => {
    if (!coachId) return;
    loadPlans();
  }, [coachId, session]);

  async function loadPlans() {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/coach/plans`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!coachId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const isEditing = editing !== null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/plans${isEditing ? `/${editing}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price) || 0,
          currency: form.currency,
          billing_period: form.billing_period,
          max_athletes: parseInt(form.max_athletes) || 10,
          max_sessions_per_week: parseInt(form.max_sessions_per_week) || 3,
          is_active: form.is_active === 'true',
        }),
      });
      if (res.ok) {
        setMessage({ text: isEditing ? 'Plan actualizado' : 'Plan creado', type: 'success' });
        setEditing(null);
        setForm({
          name: '', description: '', price: '', currency: 'COP',
          billing_period: 'monthly', max_athletes: '10', max_sessions_per_week: '3', is_active: 'true',
        });
        loadPlans();
      } else {
        setMessage({ text: 'Error al guardar plan', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de red', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function updatePlan(id: string, updates: Partial<Plan>) {
    if (!coachId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setMessage({ text: 'Plan actualizado', type: 'success' });
        loadPlans();
      } else {
        setMessage({ text: 'Error al actualizar', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de red', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: string) {
    if (!coachId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/api/v1/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        setMessage({ text: 'Plan eliminado', type: 'success' });
        loadPlans();
      } else {
        setMessage({ text: 'Error al eliminar', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de red', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function editPlan(plan: Plan) {
    setEditing(plan.id);
    setForm({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      currency: plan.currency,
      billing_period: plan.billing_period,
      max_athletes: plan.max_athletes.toString(),
      max_sessions_per_week: plan.max_sessions_per_week.toString(),
      is_active: plan.is_active.toString(),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({
      name: '', description: '', price: '', currency: 'COP',
      billing_period: 'monthly', max_athletes: '10', max_sessions_per_week: '3', is_active: 'true',
    });
  }

  if (!user) return null;
  if (!coachId) return <div className="p-6 text-text-secondary">No hay sesión de coach</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Mis Planes de Suscripción</h1>
          <p className="text-text-secondary">Crea y edita los planes que tus atletas podrán comprar</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', description: '', price: '', currency: 'COP', billing_period: 'monthly', max_athletes: '10', max_sessions_per_week: '3', is_active: 'true' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50"
        >
          <Plus size={16} /> Nuevo Plan
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-rose-400/10 text-rose-400 border border-rose-400/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Form */}
      <div className="bg-surface-1 rounded-xl border border-surface-2 p-6 mb-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">
          {editing ? 'Editar Plan' : 'Crear Plan Nuevo'}
        </h2>
        <button onClick={cancelEdit} className="text-xs text-text-secondary hover:text-brand-primary mb-3">
          {editing ? 'Cancelar edición' : ''}
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-text-secondary mb-1">Nombre del plan</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
              placeholder="Ej. Plan Mensual Básico"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-text-secondary mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
              rows={2}
              placeholder="Qué incluye este plan"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Precio</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
                placeholder="0"
              />
              <span className="text-xs text-text-secondary">{form.currency}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Periodo de facturación</label>
            <select
              value={form.billing_period}
              onChange={e => setForm({ ...form, billing_period: e.target.value })}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Máx. atletas</label>
            <input
              type="number"
              value={form.max_athletes}
              onChange={e => setForm({ ...form, max_athletes: e.target.value })}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Sesiones por semana</label>
            <input
              type="number"
              value={form.max_sessions_per_week}
              onChange={e => setForm({ ...form, max_sessions_per_week: e.target.value })}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-text-primary focus:border-brand-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={savePlan}
              disabled={saving || !form.name || !form.price}
              className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editing ? 'Actualizar Plan' : 'Crear Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="bg-surface-1 rounded-xl border border-surface-2 p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">Tus Planes</h2>
        {loading ? (
          <div className="text-text-secondary text-center py-8">Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div className="text-text-secondary text-center py-8">No tienes planes aún. Crea tu primer plan.</div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan: Plan) => (
              <div key={plan.id} className="p-4 rounded-lg border border-surface-2 bg-surface-2">
                <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary">{plan.name}</h3>
                      {plan.is_active ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-400/10 text-emerald-400">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-400/10 text-rose-400">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">{plan.description}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {plan.max_athletes} atletas máx. • {plan.max_sessions_per_week} sesiones/semana • {plan.billing_period}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-text-primary">${plan.price} {plan.currency}</div>
                    <p className="text-xs text-text-secondary">/mes</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => editPlan(plan)}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    <Settings size={14} className="mr-1" /> Editar
                  </button>
                  <button
                    onClick={() => updatePlan(plan.id, { is_active: !plan.is_active })}
                    className="text-xs text-text-secondary hover:text-brand-primary"
                  >
                    {plan.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 size={14} className="mr-1" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 bg-surface-1 rounded-xl border border-surface-2 p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">Cómo funcionan tus planes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-surface-2 border border-surface-2">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-text-primary">Cobro automático</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Tus atletas pagan por Wompi y tú recibes el pago directamente en tu cuenta.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-2 border border-surface-2">
            <div className="flex items-center gap-3 mb-3">
              <User size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-text-primary">Gestión de atletas</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Cada plan tiene un límite de atletas. Controla cuántos atletas puedes entrenar.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-2 border border-surface-2">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-text-primary">Facturación recurrente</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Los pagos se renuevan automáticamente según el período de facturación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
