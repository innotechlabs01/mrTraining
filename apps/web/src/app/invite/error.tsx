'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function InviteError({
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
      title="Error cargando la invitación"
      description="No se pudo cargar esta página de invitación. Inténtalo de nuevo."
    />
  );
}
