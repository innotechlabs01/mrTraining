'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function MarketingLegacyNotFound() {
  return (
    <AppNotFound
      title="Página no encontrada"
      description="La página de marketing que buscas no existe."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
