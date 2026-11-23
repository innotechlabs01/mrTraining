'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function MeetError({
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
      title="Error cargando la sesión"
      description="No se pudo cargar la sesión en vivo. Inténtalo de nuevo."
    />
  );
}
