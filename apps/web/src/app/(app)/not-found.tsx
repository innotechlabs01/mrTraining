'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function AppNotFoundPage() {
  return (
    <AppNotFound
      title="Sección no encontrada"
      description="La sección del panel que buscas no existe."
      actionLabel="Volver al panel"
      actionHref="/coach/plan"
    />
  );
}
