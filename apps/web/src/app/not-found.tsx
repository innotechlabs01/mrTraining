'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function RootNotFound() {
  return (
    <AppNotFound
      title="Página no encontrada"
      description="La página que buscas no existe o se ha movido."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
