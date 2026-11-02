/**
 * Go API list envelope unwrapper.
 *
 * Go handlers return `ListResponse<T>`: `{ data: T[], total, page, limit }`
 * (see apps/api pkg/response + handlers). Some legacy consumers expect the
 * bare array. `asList` normalizes both shapes and is crash-proof.
 */
export function asList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}
