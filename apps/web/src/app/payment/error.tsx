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
      variant="payment"
      title="Error de pago"
      description="No se pudo procesar la página de pago. Inténtalo de nuevo."
    />
  );
}
