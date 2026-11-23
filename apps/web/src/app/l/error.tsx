'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function LError({
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
      title="Error cargando la página"
      description="Algo salió mal al cargar esta página de destino. Inténtalo de nuevo."
    />
  );
}
