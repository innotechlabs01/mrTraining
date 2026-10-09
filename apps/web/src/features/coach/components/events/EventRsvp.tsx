'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { coachingApi } from '@/features/shared/api/client';

type Phase = 'idle' | 'confirmed' | 'cancelled';

function tokenKey(eventId: string) {
  return `event-rsvp:${eventId}`;
}
function statusKey(eventId: string) {
  return `event-rsvp-status:${eventId}`;
}

export function EventRsvp({ eventId }: { eventId: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey(eventId));
    const status = localStorage.getItem(statusKey(eventId));
    if (token && (status === 'accepted' || status === 'cancelled')) {
      setPhase(status === 'accepted' ? 'confirmed' : 'cancelled');
    }
  }, [eventId]);

  const submit = async (status: 'accepted' | 'cancelled') => {
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem(tokenKey(eventId)) ?? undefined;
      const res = await coachingApi.rsvpEvent(eventId, {
        token,
        status,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      localStorage.setItem(tokenKey(eventId), res.token);
      localStorage.setItem(statusKey(eventId), res.status);
      setPhase(res.status === 'accepted' ? 'confirmed' : 'cancelled');
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la respuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'confirmed') {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5" /> Asistencia confirmada
        </div>
        <p className="text-xs text-white/50 mt-1">Te esperamos. Guardamos tu confirmación.</p>
        <button
          onClick={() => submit('cancelled')}
          disabled={submitting}
          className="mt-3 text-xs text-white/50 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          Cancelar mi asistencia
        </button>
      </div>
    );
  }

  if (phase === 'cancelled') {
    return (
      <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
        <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
          <XCircle className="w-5 h-5" /> Cancelaste tu asistencia
        </div>
        <button
          onClick={() => submit('accepted')}
          disabled={submitting}
          className="mt-3 text-xs text-brand-primary hover:underline disabled:opacity-50"
        >
          Volver a confirmar
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors"
      >
        Confirmar asistencia
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface-2 p-4 space-y-3">
      <p className="text-sm font-medium text-white">Confirmar asistencia</p>
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Nombre *</label>
        <input
          id="rsvp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
        <input
          id="rsvp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Teléfono</label>
        <input
          id="rsvp-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 11 0000 0000"
          className="w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => submit('accepted')}
          disabled={submitting || name.trim() === ''}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar
        </button>
        <button
          onClick={() => setShowForm(false)}
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg border border-white/10 text-sm text-white/60 hover:border-white/20 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}