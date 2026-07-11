'use client';

import { MapPin, Clock, Users } from 'lucide-react';
import type { CoachEvent } from '@/features/coach/types';
import { EventFormatBody } from './EventFormatBody';
import { usePublicPageConfig } from '@/features/coach/hooks/usePublicPageConfig';

const TYPE_LABELS: Record<string, string> = {
  competition: 'Competencia',
  meeting: 'Meeting',
  reunion: 'Reunión',
  evaluacion: 'Evaluación',
  other: 'Otro',
};
const FORMAT_LABELS: Record<string, string> = {
  lista: 'Lista',
  formulario: 'Formulario',
  running: 'Running',
};

export function PublicEventView({ event }: { event: CoachEvent }) {
  const { config } = usePublicPageConfig();

  return (
    <div className="min-h-[70vh] bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand-primary uppercase">{config.brandName}</p>
          {config.tagline && <p className="text-xs text-white/40 mt-1">{config.tagline}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-2xl">
          <h1 className="text-lg font-display font-bold text-white">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/60">{TYPE_LABELS[event.type]}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-primary/15 text-brand-primary">{FORMAT_LABELS[event.format ?? 'lista']}</span>
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
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-white/30" /> {event.athleteIds.length} inscritos
            </div>
          </div>

          {event.description && <p className="mt-4 text-sm text-white/60">{event.description}</p>}

          {config.welcomeMessage && (
            <p className="mt-4 rounded-lg bg-surface-2 border border-white/5 px-3 py-2 text-xs text-white/70">{config.welcomeMessage}</p>
          )}

          <div className="mt-5 pt-4 border-t border-white/10">
            <EventFormatBody event={event} />
          </div>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-3">{config.footerText}</p>
      </div>
    </div>
  );
}
