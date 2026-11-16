const SUPER_ADMIN_IDS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);

export { SUPER_ADMIN_IDS };

/**
 * Extrae el rol de la sesión desde los claims públicos de Clerk.
 * Los roles los escribe únicamente la Go API en Clerk publicMetadata;
 * el cliente nunca puede forjarlos.
 */
export function resolveRole(sessionClaims: unknown, user: unknown): string | undefined {
  const claims = sessionClaims as { publicMetadata?: Record<string, unknown> } | null | undefined;
  return (
    (claims?.publicMetadata?.role ??
      (user as { publicMetadata?: Record<string, unknown> } | undefined)?.publicMetadata?.role) as
    | string
    | undefined
  );
}

/**
 * Resuelve el destino del guardia de sesión de sign-up.
 *
 * Devuelve la URL de redirección o null si aún se está comprobando la
 * suscripción (no hay destino definitivo aún).
 */
export function signUpGuardDestination(
  isSuperAdmin: boolean,
  role: string | undefined,
  subscriptionStatus: 'paid' | 'pending' | null,
  plan: string | null,
): string | null {
  if (isSuperAdmin) return '/admin/dashboard';
  if (role === 'coach') {
    if (subscriptionStatus === 'paid') return '/coach/plan';
    if (subscriptionStatus === 'pending') {
      return plan ? `/payment/interstitial?plan=${encodeURIComponent(plan)}` : '/payment/interstitial';
    }
    return null; // aún comprobando suscripción
  }
  // Sin rol (atleta o sin asignar): landing pública, nunca /sign-in ni /coach.
  return '/';
}
