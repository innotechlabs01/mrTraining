'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { coachingApi } from '@/features/shared/api/client';
import { PublicEventView } from '@/features/coach/components/events/PublicEventView';

export default function PublicEventPage() {
  const params = useParams<{ id: string }>();
  const { data: event, isLoading } = useQuery({
    queryKey: ['public-event', params.id],
    queryFn: () => coachingApi.getPublicEvent(params.id),
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <div className="h-8 w-40 rounded bg-surface-3 animate-pulse mx-auto" />
          <div className="h-48 rounded-2xl bg-surface-2 animate-pulse" />
        </div>
      </div>
    );
  }

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
