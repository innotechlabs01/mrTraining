'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function RootError({
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
      title="Ha ocurrido un error"
      description="Algo salió mal al cargar la aplicación. Inténtalo de nuevo."
    />
  );
}
