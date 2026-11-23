'use client';
import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

export default function PaymentError({
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
      title="Error de pago"
      description="No se pudo procesar la página de pago. Inténtalo de nuevo."
    />
  );
}
