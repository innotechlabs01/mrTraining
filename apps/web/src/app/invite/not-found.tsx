'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function InviteNotFound() {
  return (
    <AppNotFound
      title="Invitación no encontrada"
      description="La invitación que buscas no existe o ya expiró."
      actionLabel="Volver al inicio"
      actionHref="/"
    />
  );
}
