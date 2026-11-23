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
      variant="event"
      title="Error cargando el evento"
      description="No se pudo cargar la página del evento. Inténtalo de nuevo."
    />
  );
}
