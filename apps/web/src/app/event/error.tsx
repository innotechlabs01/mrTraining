'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function EventError({
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
      title="Error cargando el evento"
      description="No se pudo cargar la página del evento. Inténtalo de nuevo."
    />
  );
}
