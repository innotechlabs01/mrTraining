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
      variant="dashboard"
      title="Error en el panel"
      description="Algo salió mal al cargar el panel de entrenamiento. Inténtalo de nuevo."
    />
  );
}
