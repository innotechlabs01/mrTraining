/**
 * Pure visibility gate for OfflineBanner, kept in its own module so tests and
 * non-render consumers never pull in Reanimated/NetInfo (native modules).
 *
 * NetInfo reports `isConnected: null` until the first state resolves, so null is
 * treated as "unknown" and the banner stays hidden — this avoids a flash on boot.
 */
export function shouldShowOfflineBanner(isConnected: boolean | null): boolean {
  return isConnected === false;
}
