import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { MembershipIcon } from '../../../../shared/components/icons';
import { MembershipStatusBadge } from './MembershipStatusBadge';

type Props = {
  planName: string;
  planPrice: number | null;
  status: string;
  periodStart: string | null;
  /** End of the current billing period (current_period_end). */
  periodEnd?: string | null;
  /** Payment due date (payment_due_date) — last day the athlete can pay. */
  dueDate: string | null;
  daysRemaining: number | null;
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    // Date-only strings ("YYYY-MM-DD") parse as UTC midnight, shifting the
    // displayed day in non-UTC timezones. Parse them as local midnight.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(`${dateStr}T00:00:00`)
      : new Date(dateStr);
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `$${Number(amount).toFixed(2)}`;
}

export function MembershipHeroCard({
  planName,
  planPrice,
  status,
  periodStart,
  periodEnd,
  dueDate,
  daysRemaining,
}: Props) {
  const statusLabel =
    status === 'active'
      ? 'Activa'
      : status === 'grace_period' || status === 'grace'
        ? 'Período de gracia'
        : status === 'suspended'
          ? 'Suspendida'
          : status;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <MembershipIcon size={24} color={colors.primary} />
          </View>
          <MembershipStatusBadge status={status} label={statusLabel} />
        </View>

        <Text style={styles.planName}>{planName}</Text>
        {planPrice != null && (
          <Text style={styles.planPrice}>{formatCurrency(planPrice)} / mes</Text>
        )}

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Período</Text>
            <Text style={styles.infoValue}>
              {formatDate(periodStart ?? undefined)} al {formatDate((periodEnd ?? dueDate) ?? undefined)}
            </Text>
          </View>
          {dueDate && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vence</Text>
              <Text style={styles.infoValue}>{formatDate(dueDate ?? undefined)}</Text>
            </View>
          )}
        </View>

        {daysRemaining != null && daysRemaining >= 0 && (
          <View style={styles.daysRow}>
            <View style={styles.daysBadge}>
              <Text style={styles.daysNumber}>{daysRemaining}</Text>
              <Text style={styles.daysLabel}>días restantes</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.text,
  },
  planPrice: {
    ...typography.title,
    color: colors.primary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
  daysRow: {
    marginTop: spacing.sm,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.primary}33`,
  },
  daysNumber: {
    ...typography.bodyBold,
    color: colors.primary,
    fontWeight: '700',
  },
  daysLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
