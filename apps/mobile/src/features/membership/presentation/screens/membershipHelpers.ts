/**
 * Membership screen helpers — status label + date formatting.
 * Extracted from `MembershipScreen.tsx` (250-line budget).
 */
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.membershipScreen;

export function getStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return t.statusActive;
  if (s === 'grace_period' || s === 'grace') return t.statusGrace;
  if (s === 'suspended') return t.statusSuspended;
  if (s === 'no_membership') return t.statusNone;
  return status;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
