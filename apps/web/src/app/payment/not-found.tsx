'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function PaymentNotFound() {
  return (
    <AppNotFound
      title="Página de pago no encontrada"
      description="La página de pago que buscas no existe."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
