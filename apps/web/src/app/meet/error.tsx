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
      variant="meet"
      title="Error cargando la sesión"
      description="No se pudo cargar la sesión en vivo. Inténtalo de nuevo."
    />
  );
}
