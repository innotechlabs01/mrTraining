'use client';

import { useState } from 'react';
import { X, MapPin, Clock, Users, Check, Pencil, Trash2, Link2, Eye, Copy, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CoachEvent } from '@/features/coach/types';
import { EventFormatBody } from './EventFormatBody';
import { PublicEventView } from './PublicEventView';

const TYPE_LABELS: Record<string, string> = {
  competition: 'Competencia',
  meeting: 'Meeting',
  reunion: 'Reunión',
  evaluacion: 'Evaluación',
  other: 'Otro',
};
const TYPE_COLORS: Record<string, string> = {
  competition: 'bg-red-500/10 text-red-400',
  meeting: 'bg-blue-500/10 text-blue-400',
  reunion: 'bg-blue-500/10 text-blue-400',
  evaluacion: 'bg-purple-500/10 text-purple-400',
  other: 'bg-white/10 text-white/50',
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-green-500/10 text-green-400',
  completed: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-red-500/10 text-red-400',
};
const FORMAT_LABELS: Record<string, string> = {
  lista: 'Lista',
  formulario: 'Formulario',
  running: 'Running',
};
const FORMAT_COLORS: Record<string, string> = {
  lista: 'bg-cyan-500/10 text-cyan-400',
  formulario: 'bg-violet-500/10 text-violet-400',
  running: 'bg-amber-500/10 text-amber-400',
};

interface EventDetailModalProps {
  event: CoachEvent;
  onClose: () => void;
  onEdit: (event: CoachEvent) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string) => void;
}

export function EventDetailModal({ event, onClose, onEdit, onDelete, onTogglePublic }: EventDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);

  const isPublic = !!event.public;
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/event/${event.id}` : `/event/${event.id}`;

  const athleteCount = event.athleteIds.length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-1 border border-white/10 rounded-2xl shadow-2xl">
        <div className="relative px-6 pt-6 pb-5 border-b border-white/10">
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
          <div className="pr-8">
            <h3 className="text-xl font-display font-bold text-white">{event.title}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', TYPE_COLORS[event.type])}>{TYPE_LABELS[event.type]}</span>
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', FORMAT_COLORS[event.format ?? 'lista'])}>
                {FORMAT_LABELS[event.format ?? 'lista']}
              </span>
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[event.status])}>
                {STATUS_LABELS[event.status]}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <Clock className="w-4 h-4 text-white/30" />
              {event.date} · {event.time}–{event.endTime}
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-white/60">
                <MapPin className="w-4 h-4 text-white/30" />
                {event.location}
              </div>
            )}
            <div className="flex items-center gap-2 text-white/60">
              <Users className="w-4 h-4 text-white/30" />
              {athleteCount} participantes
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <span className="text-xs px-2 py-0.5 rounded bg-white/5 capitalize">{event.modality}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {event.description && <p className="text-sm text-white/60">{event.description}</p>}

          <div className="rounded-xl border border-white/10 bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-primary" />
                <div>
                  <p className="text-sm font-medium text-white">Disponibilizar link público</p>
                  <p className="text-xs text-white/40">Activa para compartir el registro con todo público</p>
                </div>
              </div>
              <button onClick={() => onTogglePublic(event.id)}
                className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0', isPublic ? 'bg-brand-primary' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', isPublic ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            {isPublic && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 truncate">
                    <Link2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    <span className="truncate">{shareLink}</span>
                  </div>
                  <button onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-1 border border-white/10 text-xs text-white hover:border-white/20 transition-colors shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <button onClick={() => setPreview(true)}
                  className="flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-primary-hover transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Vista previa de la página de registro
                </button>
              </div>
            )}
          </div>

          <EventFormatBody event={event} />
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-surface-1 border-t border-white/10">
          <button onClick={() => onDelete(event.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
          <button onClick={() => onEdit(event)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-2 border border-white/10 text-sm text-white hover:border-white/20 transition-colors">
            <Pencil className="w-4 h-4" /> Editar
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80" onClick={() => setPreview(false)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <PublicEventView event={event} />
          </div>
        </div>
      )}
    </div>
  );
}
