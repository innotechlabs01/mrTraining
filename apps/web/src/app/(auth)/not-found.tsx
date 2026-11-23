'use client';
import { AppNotFound } from '@/components/ui/app-not-found';

export default function AuthNotFound() {
  return (
    <AppNotFound
      title="Página de acceso no encontrada"
      description="La página de autenticación que buscas no existe."
      actionLabel="Ir al inicio de sesión"
      actionHref="/sign-in"
    />
  );
}
