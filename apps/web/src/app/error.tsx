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
      variant="default"
      title="Ha ocurrido un error"
      description="Algo salió mal al cargar esta página. Inténtalo de nuevo."
    />
  );
}
