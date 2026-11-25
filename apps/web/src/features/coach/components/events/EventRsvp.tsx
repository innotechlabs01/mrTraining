'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { coachingApi } from '@/features/shared/api/client';
import type { CoachEvent } from '@/features/coach/types';

function registeredKey(eventId: string) {
  return `event-registered:${eventId}`;
}

interface StoredRegistration {
  full_name: string;
  email: string;
}

const inputClass =
  'w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary';

export function EventRsvp({ event, isFull = false }: { event: CoachEvent; isFull?: boolean }) {
  const [confirmed, setConfirmed] = useState<StoredRegistration | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(registeredKey(event.id));
      if (saved) {
        const parsed = JSON.parse(saved) as StoredRegistration;
        if (parsed?.full_name && parsed?.email) {
          setConfirmed(parsed);
        }
      }
    } catch {
      // Ignore malformed localStorage entries
    }
  }, [event.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError('Por favor completa tu nombre completo y correo electrónico.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await coachingApi.registerPublicEvent(event.id, {
        full_name: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      const record: StoredRegistration = { full_name: trimmedName, email: trimmedEmail };
      try {
        localStorage.setItem(registeredKey(event.id), JSON.stringify(record));
      } catch {
        // Ignore storage quota errors
      }
      setConfirmed(record);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          ¡Inscripción confirmada!
        </div>
        <p className="text-xs text-white/70">
          Registramos tu participación en <span className="font-medium text-white">{event.title}</span>.
        </p>
        <div className="text-xs text-white/50 pt-1 border-t border-white/10 space-y-0.5">
          <p>
            Nombre: <span className="text-white/80">{confirmed.full_name}</span>
          </p>
          <p>
            Correo: <span className="text-white/80">{confirmed.email}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!showForm) {
    if (isFull) {
      return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 text-center">
          Cupo completo. Ya no hay lugares disponibles para este evento.
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors"
      >
        Inscribirme al evento
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-surface-2 p-4 space-y-3">
      <p className="text-sm font-medium text-white">Registro al evento</p>

      <div>
        <label htmlFor="event-reg-full-name" className="block text-xs font-medium text-white/60 mb-1.5">
          Nombre completo <span className="text-red-400">*</span>
        </label>
        <input
          id="event-reg-full-name"
          name="full_name"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Tu nombre completo"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="event-reg-email" className="block text-xs font-medium text-white/60 mb-1.5">
          Correo electrónico <span className="text-red-400">*</span>
        </label>
        <input
          id="event-reg-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="event-reg-phone" className="block text-xs font-medium text-white/60 mb-1.5">
          Teléfono
        </label>
        <input
          id="event-reg-phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+57 300 000 0000"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="event-reg-notes" className="block text-xs font-medium text-white/60 mb-1.5">
          Notas o comentarios
        </label>
        <textarea
          id="event-reg-notes"
          name="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Categoría, talla de camiseta o cualquier comentario adicional"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || fullName.trim() === '' || email.trim() === ''}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Enviando...' : 'Confirmar inscripción'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg border border-white/10 text-sm text-white/60 hover:border-white/20 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
