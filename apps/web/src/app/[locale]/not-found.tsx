'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function LocaleNotFound() {
  return (
    <AppNotFound
      title="Página no encontrada"
      description="La página que buscas no existe en este idioma."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
