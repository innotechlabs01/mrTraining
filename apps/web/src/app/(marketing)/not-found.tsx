'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function MarketingNotFound() {
  return (
    <AppNotFound
      title="Página no encontrada"
      description="La página pública que buscas no existe."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
