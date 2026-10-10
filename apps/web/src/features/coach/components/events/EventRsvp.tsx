'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { coachingApi } from '@/features/shared/api/client';
import type { CoachEvent, EventFormField } from '@/features/coach/types';

type Phase = 'idle' | 'confirmed' | 'cancelled';

function tokenKey(eventId: string) {
  return `event-rsvp:${eventId}`;
}
function statusKey(eventId: string) {
  return `event-rsvp-status:${eventId}`;
}

const inputClass =
  'w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary';

export function EventRsvp({ event }: { event: CoachEvent }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customFields = event.formFields ?? [];

  useEffect(() => {
    const token = localStorage.getItem(tokenKey(event.id));
    const status = localStorage.getItem(statusKey(event.id));
    if (token && (status === 'accepted' || status === 'cancelled')) {
      setPhase(status === 'accepted' ? 'confirmed' : 'cancelled');
    }
  }, [event.id]);

  const missingRequired = (fields: EventFormField[]) =>
    fields.filter((f) => f.required && !(answers[f.id] ?? '').trim());

  const submit = async (status: 'accepted' | 'cancelled') => {
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem(tokenKey(event.id)) ?? undefined;
      const payloadAnswers = status === 'accepted'
        ? customFields
            .filter((f) => (answers[f.id] ?? '').trim() !== '')
            .map((f) => ({ field_id: f.id, value: answers[f.id].trim() }))
        : [];
      const res = await coachingApi.rsvpEvent(event.id, {
        token,
        status,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        answers: payloadAnswers,
      });
      localStorage.setItem(tokenKey(event.id), res.token);
      localStorage.setItem(statusKey(event.id), res.status);
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
          <CheckCircle2 className="w-5 h-5" />
          Asistencia confirmada
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
          <XCircle className="w-5 h-5" />
          Cancelaste tu asistencia
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

  const requiredPending = missingRequired(customFields);

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
          className={inputClass}
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
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Teléfono</label>
        <input
          id="rsvp-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 11 0000 0000"
          className={inputClass}
        />
      </div>

      {customFields.map((f) => (
        <div key={f.id}>
          <label className="block text-xs font-medium text-white/50 mb-1.5">
            {f.label}
            {f.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {f.kind === 'select' ? (
            <div className="flex flex-wrap gap-2">
              {(f.options ?? []).map((opt) => {
                const selected = answers[f.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [f.id]: selected ? '' : opt }))}
                    className={
                      selected
                        ? 'px-3 py-1.5 rounded-full text-xs font-medium bg-brand-primary text-white'
                        : 'px-3 py-1.5 rounded-full text-xs font-medium bg-surface-1 border border-white/10 text-white/70 hover:border-white/20'
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : f.kind === 'multiple' ? (
            <div className="flex flex-wrap gap-2">
              {(f.options ?? []).map((opt) => {
                const current = (answers[f.id] ?? '').split('\u0001').filter(Boolean);
                const selected = current.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => {
                        const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                        return { ...prev, [f.id]: next.join('\u0001') };
                      })
                    }
                    className={
                      selected
                        ? 'px-3 py-1.5 rounded-full text-xs font-medium bg-brand-primary text-white'
                        : 'px-3 py-1.5 rounded-full text-xs font-medium bg-surface-1 border border-white/10 text-white/70 hover:border-white/20'
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="text"
              value={answers[f.id] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
              placeholder="Escribe tu respuesta"
              className={inputClass}
            />
          )}
        </div>
      ))}

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => submit('accepted')}
          disabled={submitting || name.trim() === '' || requiredPending.length > 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmar
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
