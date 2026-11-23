'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function LNotFound() {
  return (
    <AppNotFound
      title="Página de destino no encontrada"
      description="La página de destino que buscas no existe."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
