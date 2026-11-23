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
      variant="invite"
      title="Error cargando la invitación"
      description="No se pudo cargar esta página de invitación. Inténtalo de nuevo."
    />
  );
}
