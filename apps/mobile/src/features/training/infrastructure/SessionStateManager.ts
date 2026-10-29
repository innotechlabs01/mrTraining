/**
 * SessionStateManager — persistencia de estado de sesión en MMKV.
 *
 * Permite recuperar el estado de una sesión activa tras cierre inesperado
 * de la aplicación (cuando la plataforma lo permita).
 */

import { MMKV } from 'react-native-mmkv';
import type { SessionPersistedState } from '../domain/TrackingEngine';

const storage = new MMKV({ id: 'running-session-state' });

const ESTADO_KEY = (sessionId: string) => `running_session_state:${sessionId}`;
const ULTIMO_TS_KEY = (sessionId: string) => `running_last_ts:${sessionId}`;
const METRICA_KEY = (sessionId: string) => `running_metrics:${sessionId}`;
const SPLITS_KEY = (sessionId: string) => `running_splits:${sessionId}`;

/**
 * Guarda el estado completo de una sesión.
 */
export async function guardarEstadoSesion(state: SessionPersistedState): Promise<void> {
  storage.set(ESTADO_KEY(state.sessionId), JSON.stringify(state));
  storage.set(ULTIMO_TS_KEY(state.sessionId), state.ultimaActualizacion);
  storage.set(METRICA_KEY(state.sessionId), JSON.stringify(state.metrica));
  storage.set(SPLITS_KEY(state.sessionId), JSON.stringify(state.splits));
}

/**
 * Carga el estado persistido de una sesión. Devuelve null si no existe.
 */
export async function cargarEstadoSesion(sessionId: string): Promise<SessionPersistedState | null> {
  try {
    const raw = storage.getString(ESTADO_KEY(sessionId));
    if (!raw) return null;
    const state = JSON.parse(raw) as SessionPersistedState;
    return state;
  } catch {
    return null;
  }
}

/**
 * Carga solo las métricas de una sesión.
 */
export async function cargarMetricaSesion(sessionId: string): Promise<any | null> {
  try {
    const raw = storage.getString(METRICA_KEY(sessionId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Carga solo los splits de una sesión.
 */
export async function cargarSplitsSesion(sessionId: string): Promise<any[] | null> {
  try {
    const raw = storage.getString(SPLITS_KEY(sessionId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Obtiene el último timestamp procesado de una sesión.
 */
export async function obtenerUltimoTimestamp(sessionId: string): Promise<string | null> {
  try {
    return storage.getString(ULTIMO_TS_KEY(sessionId));
  } catch {
    return null;
  }
}

/**
 * Elimina el estado persistido de una sesión (tras sincronización exitosa).
 */
export async function limpiarEstadoSesion(sessionId: string): Promise<void> {
  storage.delete(ESTADO_KEY(sessionId));
  storage.delete(ULTIMO_TS_KEY(sessionId));
  storage.delete(METRICA_KEY(sessionId));
  storage.delete(SPLITS_KEY(sessionId));
}

/**
 * Lista todas las sesiones con estado persistido (útil para recuperar
 * sesiones activas tras reinicio de app).
 */
export function listarSesionesActivas(): string[] {
  const todasLasClaves = storage.getAllKeys();
  const prefijo = 'running_session_state:';
  const sesiones: string[] = [];
  for (const clave of todasLasClaves) {
    if (clave.startsWith(prefijo)) {
      sesiones.push(clave.slice(prefijo.length));
    }
  }
  return sesiones;
}
