/**
 * Centralized Clerk error mapping — single source of truth for
 * translating Clerk API errors into user-facing copy + recovery actions.
 *
 * Usage:
 *   const resolved = resolveClerkError(err);
 *   showToast(resolved.kind, resolved.title, resolved.message);
 *   if (resolved.shouldSignOut) await signOut();
 */

export type ClerkErrorResolution = {
  /** Toast kind for showToast. */
  kind: 'error' | 'info' | 'success';
  /** Toast title. */
  title: string;
  /** Toast body, ready to display (already localized ES). */
  message: string;
  /** Stale client session detected — caller should signOut() so user can retry. */
  shouldSignOut: boolean;
  /** Password rejected by breach check — caller should suggest reset flow. */
  shouldOfferReset: boolean;
};

type ClerkErrorShape = {
  errors?: Array<{
    code?: string;
    message?: string;
    longMessage?: string;
  }>;
};

const FALLBACK_SIGN_IN = 'No se pudo iniciar sesión. Intenta de nuevo.';
const FALLBACK_SIGN_UP = 'No se pudo crear la cuenta. Intenta de nuevo.';
const FALLBACK_GENERIC = 'Ocurrió un error. Intenta de nuevo.';

function firstCode(err: unknown): string | null {
  const clerkErr = err as ClerkErrorShape;
  return clerkErr?.errors?.[0]?.code ?? null;
}

function firstMessage(err: unknown): string | null {
  const clerkErr = err as ClerkErrorShape;
  return clerkErr?.errors?.[0]?.longMessage ?? clerkErr?.errors?.[0]?.message ?? null;
}

/**
 * Resolve a Clerk sign-in/sign-up/reset error into display copy + actions.
 * `fallback` picks the default message when Clerk sends no usable text.
 */
export function resolveAuthError(
  err: unknown,
  context: 'signin' | 'signup' | 'reset' = 'signin',
): ClerkErrorResolution {
  const fallback =
    context === 'signin'
      ? FALLBACK_SIGN_IN
      : context === 'signup'
        ? FALLBACK_SIGN_UP
        : FALLBACK_GENERIC;

  const base: ClerkErrorResolution = {
    kind: 'error',
    title: 'Error',
    message: (err instanceof Error && err.message) || fallback,
    shouldSignOut: false,
    shouldOfferReset: false,
  };

  const code = firstCode(err);
  const clerkMessage = firstMessage(err);

  switch (code) {
    case 'form_password_pwned':
      return {
        ...base,
        kind: 'error',
        message:
          'Por seguridad, tu contraseña aparece en filtraciones conocidas. Restablece tu contraseña.',
        shouldOfferReset: true,
      };
    case 'form_password_incorrect':
      return {
        ...base,
        message: clerkMessage ?? 'Contraseña incorrecta. Intenta de nuevo.',
      };
    case 'session_exists':
      return {
        ...base,
        kind: 'info',
        message: 'Ya tienes una sesión activa.',
        shouldSignOut: true,
      };
    case 'form_identifier_not_found':
      return {
        ...base,
        message: clerkMessage ?? 'No encontramos una cuenta con ese correo.',
      };
    case 'form_code_incorrect':
      return {
        ...base,
        message: clerkMessage ?? 'Código incorrecto. Revisa tu correo.',
      };
    case '429':
      return {
        ...base,
        kind: 'info',
        message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      };
    default:
      return base;
  }
}
