/**
 * Clerk REST API Service
 * 
 * Servicio que se comunica directamente con las APIs públicas de Clerk
 * usando la publishable key configurada en .env o app.json.
 * 
 * Evita las limitaciones del SDK de @clerk/clerk-expo en Expo Go.
 * 
 * Documentación: https://docs.clerk.com/reference
 */

// Clave pública de Clerk - leer de process.env (cargar desde .env)
const CLERK_PUBLISHABLE_KEY =
  process.env.CLERK_PUBLISH_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  '';

// Base URL de las APIs públicas de Clerk
const CLERK_API_BASE = 'https://api.clerk.com/v1';

/**
 * Interfaz para los datos del usuario que necesitamos en la app
 */
export interface ClerkUser {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  username: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  /** Token JWT para autenticar con tu Go API */
  token?: string;
}

/**
 * Obtiene un token JWT después del sign-in con email/password
 * 
 * POST /v1/password_auth_sign_ins
 * Body: { identity: email, password }
 */
export async function signInWithPassword(email: string, password: string) {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('CLERK_PUBLISHABLE_KEY no está configurada');
  }

  const response = await fetch(`${CLERK_API_BASE}/password_auth_sign_ins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Enviar la key como header Authorization o en el body
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      identity: email,
      password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || errorData.error || 'Credenciales inválidas';
    throw new Error(message);
  }

  const data = await response.json();
  return data; // Contiene token, user_id, etc.
}

/**
 * Registra un nuevo usuario con email y password
 * 
 * POST /v1/users
 * Body: { email_address: email, password, full_name?: string }
 */
export async function registerWithPassword(
  email: string,
  password: string,
  fullName?: string
) {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('CLERK_PUBLISHABLE_KEY no está configurada');
  }

  const response = await fetch(`${CLERK_API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
      password,
      ...(fullName && { full_name: fullName }),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || errorData.error || 'Error al registrar';
    throw new Error(message);
  }

  return await response.json(); // user_id, token, etc.
}

/**
 * Cierra la sesión - revoca la sesión actual
 * 
 * DELETE /v1/sessions
 */
export async function signOutFromClerk() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return; // Si no hay key, solo limpiar localmente
  }

  await fetch(`${CLERK_API_BASE}/sessions`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${CLERK_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Obtiene los datos del usuario actual
 * 
 * GET /v1/user
 */
export async function getCurrentUserClerk(): Promise<ClerkUser | null> {
  if (!CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  const response = await fetch(`${CLERK_API_BASE}/user`, {
    headers: {
      'Authorization': `Bearer ${CLERK_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

/**
 * Verifica que un token sea válido para tu Go API
 * Usado antes de enviar el token a tu backend
 */
export async function verifyTokenForBackend(token: string) {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('CLERK_PUBLISHABLE_KEY no configurada');
  }

  const response = await fetch(
    `${CLERK_API_BASE}/tokens/${token}/verified`,
    {
      headers: {
        'Authorization': `Bearer ${CLERK_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Token inválido');
  }

  return await response.json();
}