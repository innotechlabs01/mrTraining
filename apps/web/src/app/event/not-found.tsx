'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function EventNotFound() {
  return (
    <AppNotFound
      title="Evento no encontrado"
      description="El evento que buscas no existe."
      actionLabel="Ver todos los eventos"
      actionHref="/"
    />
  );
}
