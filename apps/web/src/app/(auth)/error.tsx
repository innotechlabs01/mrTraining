'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <AppErrorBoundary
      error={error}
      reset={reset}
      title="Error de autenticación"
      description="No se pudo cargar la página de acceso. Inténtalo de nuevo."
    />
  );
}
