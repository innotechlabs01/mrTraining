'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function AppError({
  error,
  reset,
  variant,
}: {
  error: Error;
  reset: () => void;
  variant: string;
}) {
  return (
    <AppErrorBoundary
      error={error}
      reset={reset}
      variant="auth"
      title="Error de autenticación"
      description="No se pudo cargar la página de acceso. Inténtalo de nuevo."
    />
  );
}
