import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, layout, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { AlertBanner } from '../../../../shared/components/ui/AlertBanner';
import { showToast } from '../../../../shared/components/ui/Toast';
import { texts } from '../../../../shared/i18n/texts';
import { MembershipSkeleton } from '../components/MembershipSkeleton';
import { NoMembershipState } from '../components/NoMembershipState';
import { MembershipHeroCard } from '../components/MembershipHeroCard';
import { PaymentHistoryList } from '../components/PaymentHistoryList';

const t = texts.screens.membershipScreen;

type MembershipResponse = {
  membership?: {
    id: string;
    planName: string;
    planPrice: number;
    paymentDueDate: string;
    currentPeriodEnd: string;
    currentPeriodStart?: string;
    status?: string;
    athleteId: string;
    coachId: string;
    daysRemaining?: number;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    date?: string;
    paymentDate?: string;
    createdAt?: string;
    status?: string;
    transactionId?: string;
    reference?: string;
  }>;
  isPayable?: boolean;
  status?: string;
  planName?: string;
  planPrice?: number;
  paymentDueDate?: string;
  currentPeriodEnd?: string;
  currentPeriodStart?: string;
  daysRemaining?: number;
};

// The Go API (source of truth) serializes the membership DTO in snake_case
// (plan_name, plan_price, payment_due_date, …). Normalize once at the query
// boundary so the rest of the screen keeps working with camelCase fields.
function normalizeMembership(raw: unknown): MembershipResponse['membership'] {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
  return {
    id: str(r.id),
    planName: str(r.plan_name ?? r.planName),
    planPrice: num(r.plan_price ?? r.planPrice),
    paymentDueDate: str(r.payment_due_date ?? r.paymentDueDate),
    currentPeriodEnd: str(r.current_period_end ?? r.currentPeriodEnd),
    currentPeriodStart: str(r.current_period_start ?? r.currentPeriodStart),
    status: str(r.status ?? 'active'),
    athleteId: str(r.athlete_id ?? r.athleteId),
    coachId: str(r.coach_id ?? r.coachId),
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    // Date-only strings ("YYYY-MM-DD") parse as UTC midnight, shifting the
    // displayed day in non-UTC timezones. Parse them as local midnight.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(`${dateStr}T00:00:00`)
      : new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function MembershipScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery<MembershipResponse>({
    queryKey: ['athlete-membership'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/membership');
      // The Go API returns the membership DTO directly (pkg/response.Success
      // does not wrap). Keep the legacy fallbacks for other shapes, then
      // normalize snake_case keys into the camelCase shape this screen reads.
      const raw = (data?.data?.[0] ?? data?.membership ?? data) as unknown;
      return { ...data, membership: normalizeMembership(raw) } as MembershipResponse;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Payment history: the Go API exposes it at GET /memberships/:id/payments
  // (IDOR-safe — the handler derives records from the authenticated user).
  const membershipId = data?.membership?.id ?? null;
  const { data: paymentsData } = useQuery<NonNullable<MembershipResponse['payments']>>({
    queryKey: ['athlete-membership-payments', membershipId],
    enabled: !!membershipId,
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/membership/${membershipId}/payments`);
      const arr: Array<Record<string, unknown>> = Array.isArray(data)
        ? (data as Array<Record<string, unknown>>)
        : ((data?.data as Array<Record<string, unknown>>) ?? []);
      return arr.map((p): NonNullable<MembershipResponse['payments']>[number] => {
        const item: NonNullable<MembershipResponse['payments']>[number] = {
          id: String(p.id ?? ''),
          amount: Number(p.amount ?? 0),
        };
        const paymentDate =
          typeof p.paid_at === 'string' ? p.paid_at : typeof p.created_at === 'string' ? p.created_at : undefined;
        if (paymentDate !== undefined) item.paymentDate = paymentDate;
        if (typeof p.created_at === 'string') item.createdAt = p.created_at;
        if (typeof p.status === 'string') item.status = p.status;
        if (typeof p.polar_order_id === 'string') item.transactionId = p.polar_order_id;
        return item;
      });
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        queryClient.invalidateQueries({ queryKey: ['athlete-membership'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  const handlePay = useCallback(async () => {
    setIsPaying(true);
    try {
      const { createMembershipPreference } = await import('../../membershipPayment');
      const res = await createMembershipPreference();
      if (res?.initPoint) {
        const WebBrowser = await import('expo-web-browser');
        await WebBrowser.openBrowserAsync(res.initPoint);
        await WebBrowser.dismissBrowser();
        await refetch();
        showToast('success', t.checkoutSuccessTitle, t.checkoutSuccessBody);
      } else {
        Alert.alert(t.checkoutFailedTitle, t.checkoutFailedBody);
      }
    } catch (e: unknown) {
      console.error('[Membership] MP checkout failed:', e);
      const msg = e instanceof Error ? e.message : t.genericErrorBody;
      Alert.alert(t.genericErrorTitle, msg);
    } finally {
      setIsPaying(false);
    }
  }, [refetch]);

  const rawMembership = data?.membership ?? null;
  const effectivePlanName = rawMembership?.planName ?? data?.planName ?? null;
  const effectivePlanPrice = rawMembership?.planPrice ?? data?.planPrice ?? null;
  const effectiveStatus = (rawMembership?.status ?? data?.status ?? 'active') as string;
  const effectiveDueDate = rawMembership?.paymentDueDate ?? data?.paymentDueDate ?? null;
  const effectiveCurrentPeriodStart =
    rawMembership?.currentPeriodStart ?? data?.currentPeriodStart ?? null;
  const effectiveCurrentPeriodEnd =
    rawMembership?.currentPeriodEnd ?? data?.currentPeriodEnd ?? null;
  // Days until the period ends (client-side — the API does not send this).
  const daysRemaining = (() => {
    if (rawMembership?.daysRemaining != null) return rawMembership.daysRemaining;
    if (!effectiveCurrentPeriodEnd) return data?.daysRemaining ?? null;
    const end = new Date(effectiveCurrentPeriodEnd);
    if (Number.isNaN(end.getTime())) return null;
    return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  })();
  const payments = paymentsData ?? data?.payments ?? [];
  // Payable when the Go API says the membership is past_due / expired (the
  // domain recalculates: payment date passed ⇒ expired) or when the payment
  // due date is in the past, regardless of the reported status.
  const PAYABLE_STATUSES = ['past_due', 'expired', 'grace_period', 'grace', 'suspended'];
  const dueDatePassed = (() => {
    if (!effectiveDueDate) return false;
    const due = new Date(effectiveDueDate);
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  })();
  const isPayable =
    data?.isPayable ?? (PAYABLE_STATUSES.includes(effectiveStatus) || dueDatePassed);
  const hasMembership = !!effectivePlanName || !!rawMembership;
  const isExpiring = effectiveStatus === 'grace_period' || effectiveStatus === 'grace';

  if (isLoading) {
    return <MembershipSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.planTitle} onBack={() => navigation.goBack()} />

        {isExpiring && (
          <AlertBanner
            tone="warning"
            title={t.expiringTitle}
            message={t.expiringBody}
            actionLabel={t.renewCta}
            onAction={handlePay}
          />
        )}

        {!hasMembership ? (
          <NoMembershipState onPayPress={handlePay} />
        ) : (
          <MembershipHeroCard
            planName={effectivePlanName ?? ''}
            planPrice={effectivePlanPrice}
            status={effectiveStatus}
            periodStart={effectiveCurrentPeriodStart}
            periodEnd={effectiveCurrentPeriodEnd}
            dueDate={effectiveDueDate}
            daysRemaining={daysRemaining}
          />
        )}

        <Text style={styles.sectionEyebrow}>{t.historyTitle}</Text>
        <PaymentHistoryList payments={payments} />

        <PrimaryButton
          label={isPayable ? t.payNow : `${t.paidUp} ${formatDate(effectiveDueDate ?? undefined)}`}
          onPress={handlePay}
          disabled={!isPayable || isPaying}
          loading={isPaying}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scrollContent: {
    padding: layout.pagePadding,
    paddingBottom: spacing.lg * 2,
    gap: spacing.md,
  },
  sectionEyebrow: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
