'use client';

import { useParams } from 'next/navigation';
import { useEvents } from '@/features/coach/hooks/useEvents';
import { PublicEventView } from '@/features/coach/components/events/PublicEventView';

export default function PublicEventPage() {
  const params = useParams<{ id: string }>();
  const { events } = useEvents();
  const event = events.find((e) => e.id === params.id);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60">Evento no encontrado</p>
          <p className="text-xs text-white/30 mt-1">El enlace puede haber expirado o no estar disponible públicamente.</p>
        </div>
      </div>
    );
  }

  return <PublicEventView event={event} />;
}
