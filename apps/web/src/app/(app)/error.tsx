'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function AppError({
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
      title="Error en el panel"
      description="Algo salió mal al cargar el panel de entrenamiento. Inténtalo de nuevo."
    />
  );
}
