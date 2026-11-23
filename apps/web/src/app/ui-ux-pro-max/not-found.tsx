'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function UiUxProMaxNotFound() {
  return (
    <AppNotFound
      title="Página no encontrada"
      description="La página que buscas no existe."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
