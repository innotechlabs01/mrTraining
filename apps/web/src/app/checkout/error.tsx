'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function CheckoutError({
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
      title="Error en el checkout"
      description="No se pudo cargar la página de pago. Inténtalo de nuevo."
    />
  );
}
