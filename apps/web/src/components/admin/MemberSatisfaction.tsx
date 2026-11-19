'use client';

import { Star, Smile, ThumbsUp, Heart, MessageSquare } from 'lucide-react';

interface FeedbackItem {
  id: string;
  name: string;
  avatarText: string;
  rating: number;
  comment: string;
  time: string;
  tier: string;
}

const RECENT_FEEDBACK: FeedbackItem[] = [
  {
    id: 'f1',
    name: 'Valentina Restrepo',
    avatarText: 'VR',
    rating: 5,
    comment: 'Las clases de HIIT por la mañana son espectaculares. Los entrenadores están súper atentos.',
    time: 'Hace 2 horas',
    tier: 'Platinum',
  },
  {
    id: 'f2',
    name: 'Mateo Gómez',
    avatarText: 'MG',
    rating: 5,
    comment: 'La app móvil y el acceso al sauna con la Loyalty Card hacen toda la diferencia.',
    time: 'Hace 5 horas',
    tier: 'Gold',
  },
  {
    id: 'f3',
    name: 'Carolina Díaz',
    avatarText: 'CD',
    rating: 4,
    comment: 'Instalaciones limpias y excelentes máquinas de fuerza.',
    time: 'Ayer',
    tier: 'Gold',
  },
];

export function MemberSatisfaction() {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#26262B] pb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight text-white">Member Satisfaction</h3>
          <p className="text-xs text-[#8E8E93]">Índice de satisfacción CSAT y feedback del club</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
          <ThumbsUp size={13} /> 94% CSAT
        </span>
      </div>

      {/* Main Score overview */}
      <div className="my-4 flex items-center justify-between rounded-2xl bg-[#1B1B22] p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E07A3D] to-amber-400 text-2xl font-black text-white shadow-md">
            4.9
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={15} fill="currentColor" />
              ))}
            </div>
            <p className="mt-1 text-xs font-medium text-[#A1A1AA]">
              Basado en 1,480 reseñas de miembros activos
            </p>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <div className="text-xs font-bold uppercase tracking-wider text-[#71717A]">Net Promoter Score</div>
          <div className="text-xl font-black text-emerald-400">+78 NPS</div>
        </div>
      </div>

      {/* Sentiment bars */}
      <div className="space-y-2 border-b border-[#26262B] pb-4 text-xs">
        <div className="flex items-center justify-between text-[#8E8E93]">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Smile size={14} /> Positivo (88%)
          </span>
          <span className="font-semibold text-white">1,302 miembros</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#202026]">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: '88%' }} />
        </div>

        <div className="flex items-center justify-between text-[#8E8E93] pt-1">
          <span className="text-amber-400 font-medium">Neutro (9%)</span>
          <span className="font-semibold text-white">133 miembros</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#202026]">
          <div className="h-full rounded-full bg-amber-400" style={{ width: '9%' }} />
        </div>
      </div>

      {/* Recent Reviews list */}
      <div className="mt-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Comentarios Recientes</p>
        {RECENT_FEEDBACK.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#222228] bg-[#141418] p-3 text-xs transition-colors hover:border-[#2C2C34]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E07A3D]/20 text-[10px] font-bold text-[#E07A3D]">
                  {item.avatarText}
                </div>
                <span className="font-semibold text-white">{item.name}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold uppercase text-amber-300">
                  {item.tier}
                </span>
              </div>
              <span className="text-[10px] text-[#71717A]">{item.time}</span>
            </div>
            <p className="mt-1.5 text-[#A1A1AA] line-clamp-2">{item.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
