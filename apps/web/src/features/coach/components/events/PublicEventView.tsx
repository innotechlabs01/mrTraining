'use client';

import { MapPin, Clock, Users, Lock } from 'lucide-react';
import type { CoachEvent } from '@/features/coach/types';
import { isEventExpired } from '@/features/coach/utils/eventExpiry';
import { EventFormatBody } from './EventFormatBody';
import { EventRsvp } from './EventRsvp';
import { usePublicPageConfig } from '@/features/coach/hooks/usePublicPageConfig';

const TYPE_LABELS: Record<string, string> = {
  carrera: 'Carrera',
  competition: 'Competencia',
  meeting: 'Meeting',
  reunion: 'Reunión',
  evaluacion: 'Evaluación',
  other: 'Otro',
};
const FORMAT_LABELS: Record<string, string> = {
  lista: 'Lista',
  formulario: 'Formulario',
  running: 'Running / Carrera',
};

export function PublicEventView({ event }: { event: CoachEvent }) {
  const { config } = usePublicPageConfig();

  const accepted = event.acceptedCount ?? 0;
  const isFull = !!event.maxCapacity && accepted >= event.maxCapacity;
  const deadlinePassed =
    !!event.registrationDeadline &&
    new Date(`${event.registrationDeadline}T23:59:59`).getTime() < Date.now();
  const closed = isEventExpired(event) || event.status === 'cancelled' || deadlinePassed;
  const priceLabel =
    event.priceCents && event.priceCents > 0
      ? `${(event.priceCents / 100).toLocaleString('es-CO')} ${event.currency ?? 'COP'}`
      : 'Gratis';

  return (
    <div className="min-h-[70vh] bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand-primary uppercase">{config.brandName}</p>
          {config.tagline && <p className="text-xs text-white/40 mt-1">{config.tagline}</p>}
        </div>
        <div className="rounded-lg border border-white/10 bg-surface-1 p-5 shadow-2xl">
          <h1 className="text-lg font-display font-bold text-white">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/60">{TYPE_LABELS[event.type] ?? event.type}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-primary/15 text-brand-primary">{FORMAT_LABELS[event.format ?? 'lista']}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300">{priceLabel}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/30" /> {event.date} · {event.time}
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-white/30" /> {event.location}
              </div>
            )}
            <div className="flex items-center gap-2 text-emerald-400/90 font-medium">
              <Users className="w-3.5 h-3.5 text-emerald-400/70" />
              {event.maxCapacity
                ? `${accepted} / ${event.maxCapacity} cupos`
                : `${accepted} confirmados`}
            </div>
            {event.registrationDeadline && (
              <div className="text-[11px] text-white/40">
                Inscripción hasta: {event.registrationDeadline}
              </div>
            )}
          </div>

          {event.description && <p className="mt-4 text-sm text-white/60">{event.description}</p>}

          {config.welcomeMessage && (
            <p className="mt-4 rounded-lg bg-surface-2 border border-white/5 px-3 py-2 text-xs text-white/70">{config.welcomeMessage}</p>
          )}

          {/* Lista/running show their content; formulario's real fields live in EventRsvp below. */}
          {(event.format === 'lista' || event.format === 'running') && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <EventFormatBody event={event} hideRegistrationForm />
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/10">
            {closed ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-xs text-white/50">
                <Lock className="w-4 h-4 shrink-0" />
                {event.status === 'cancelled'
                  ? 'Este evento fue cancelado. Las inscripciones están cerradas.'
                  : deadlinePassed
                    ? 'La fecha límite de inscripción para este evento ya pasó.'
                    : 'Las inscripciones para este evento están cerradas.'}
              </div>
            ) : (
              <EventRsvp event={event} isFull={isFull} />
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-3">{config.footerText}</p>
      </div>
    </div>
  );
}
