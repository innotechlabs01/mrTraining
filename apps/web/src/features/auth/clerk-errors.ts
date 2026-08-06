export function getLocale(): string {
  if (typeof navigator === 'undefined') return 'es';
  return navigator.language || 'es';
}

const ES: Record<string, string> = {
  form_identifier_exists: 'Este correo ya está registrado.',
  form_identifier_invalid: 'Introduce un correo electrónico válido.',
  form_identifier_not_found: 'No existe una cuenta con este correo electrónico.',
  form_code_incorrect: 'Código de verificación incorrecto. Inténtalo de nuevo.',
  form_code_expired: 'El código ha expirado. Solicita uno nuevo.',
  form_code_too_many_attempts: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  form_password_incorrect: 'Contraseña incorrecta. Inténtalo de nuevo.',
  form_password_pwned: 'Esta contraseña ha sido comprometida. Elige otra.',
  form_password_length_too_short: 'La contraseña debe tener al menos 8 caracteres.',
  form_password_no_uppercase_char: 'La contraseña debe incluir al menos una mayúscula.',
  form_password_no_numeric_char: 'La contraseña debe incluir al menos un número.',
  form_password_no_special_char: 'La contraseña debe incluir al menos un carácter especial.',
  form_password_different: 'Las contraseñas no coinciden.',
  form_password_not_matching: 'Las contraseñas no coinciden.',
  form_password_reuse_not_allowed: 'No puedes reutilizar tu contraseña anterior.',
  user_locked_out: 'Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo más tarde.',
  verification_failed: 'No se pudo verificar. Inténtalo de nuevo.',
  session_exists: 'Ya tienes una sesión activa.',
};

const DEFAULT_FALLBACK = 'Algo salió mal. Inténtalo de nuevo.';

export interface ClerkApiError {
  errors?: Array<{ code?: string; message?: string }>;
}

export function translateClerkError(
  err: unknown,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const clerkErr = err as ClerkApiError | null;
  const code = clerkErr?.errors?.[0]?.code;
  const locale = getLocale().toLowerCase();

  if (locale.startsWith('es') && code && ES[code]) {
    return ES[code];
  }

  // Non-Spanish locales: keep Clerk's original (English) message.
  return clerkErr?.errors?.[0]?.message || fallback;
}

export function translateStatic(message: string, esVersion: string): string {
  if (getLocale().toLowerCase().startsWith('es')) return esVersion;
  return message;
}
