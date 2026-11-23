'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function MeetNotFound() {
  return (
    <AppNotFound
      title="Sesión no encontrada"
      description="La sesión en vivo que buscas no existe."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
