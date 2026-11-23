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
      variant="marketing"
      title="Error cargando la página"
      description="Algo salió mal al cargar esta página pública. Inténtalo de nuevo."
    />
  );
}
