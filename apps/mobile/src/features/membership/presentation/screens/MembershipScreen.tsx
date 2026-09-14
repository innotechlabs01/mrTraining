import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { AlertBanner } from '../../../../shared/components/ui/AlertBanner';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { MembershipIcon, CardIcon } from '../../../../shared/components/icons';

type MembershipResponse = {
  membership?: {
    id: string;
    planName: string;
    planPrice: number;
    paymentDueDate: string;
    currentPeriodEnd: string;
    startDate?: string;
    currentPeriodStart?: string;
    status?: string;
    athleteId: string;
    coachId: string;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    date?: string;
    createdAt?: string;
    paymentDate?: string;
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
  athleteId?: string;
  coachId?: string;
  id?: string;
};

function getStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return 'Activa';
  if (s === 'grace_period' || s === 'grace') return 'Período de gracia';
  if (s === 'suspended') return 'Suspendida';
  if (s === 'no_membership') return 'Sin membresía';
  return status;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

export function MembershipScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['athlete-membership'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/membership');
      const membership = data?.data?.[0] ?? data?.membership ?? data;
      return { ...data, membership } as MembershipResponse;
    },
    staleTime: 2 * 60 * 1000,
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

  const rawMembership = data?.membership ?? null;
  const effectivePlanName = rawMembership?.planName ?? data?.planName ?? null;
  const effectivePlanPrice = rawMembership?.planPrice ?? data?.planPrice ?? null;
  const effectiveStatus = (rawMembership?.status ?? data?.status ?? 'active') as string;
  const effectiveDueDate = rawMembership?.paymentDueDate ?? data?.paymentDueDate ?? null;
  const payments = data?.payments ?? [];
  const isPayable = data?.isPayable ?? (effectiveStatus === 'grace_period' || effectiveStatus === 'suspended');
  const hasMembership = !!effectivePlanName || !!rawMembership;

  const isExpiring = effectiveStatus === 'grace_period' || effectiveStatus === 'grace';

  const handlePay = async () => {
    const membershipId = rawMembership?.id ?? data?.id;
    const athleteId = (rawMembership?.athleteId ?? data?.athleteId) as string | undefined;
    if (!membershipId || !athleteId) {
      Alert.alert('Pagar membresía', 'La membresía no está disponible. Contactá a tu entrenador.');
      return;
    }
    setIsPaying(true);
    try {
      const { createCheckout } = await import('@features/polar/polarService');
      const res = await createCheckout(athleteId, membershipId);
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        Alert.alert('Checkout', 'No se pudo iniciar el checkout seguro.');
      }
    } catch (e) {
      console.error('Failed to start checkout', e);
      Alert.alert('Checkout', 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <ScreenHeader title="Tu plan" onBack={() => navigation.goBack()} />
          <Skeleton.List rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Tu plan" onBack={() => navigation.goBack()} />

        {isExpiring && (
          <AlertBanner
            tone="warning"
            title="Tu membresía está por vencer"
            message="Renová tu membresía para no perder el acceso a tu plan."
            actionLabel="Renovar"
            onAction={handlePay}
          />
        )}

        {!hasMembership ? (
          <ListCard
            title="Sin membresía"
            subtitle="Tu entrenador va a asignarte un plan. Contactá a tu entrenador para activar tu membresía."
            leadingIcon={<MembershipIcon size={20} color={colors.textSecondary} />}
          />
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.planName}>{effectivePlanName}</Text>
            {effectivePlanPrice != null && (
              <Text style={styles.planPrice}>{formatCurrency(effectivePlanPrice)}/mes</Text>
            )}
            <Text style={styles.statusLabel}>Estado: {getStatusLabel(effectiveStatus)}</Text>
            <Text style={styles.dateText}>
              Período: {formatDate(data?.currentPeriodStart)} al {formatDate(effectiveDueDate ?? undefined)}
            </Text>
            {effectiveDueDate && <Text style={styles.dateText}>Vence: {formatDate(effectiveDueDate)}</Text>}
          </View>
        )}

        {/* Payment history */}
        <Text style={styles.sectionEyebrow}>Historial de pagos</Text>
        {payments.length === 0 ? (
          <ListCard
            title="Sin pagos aún"
            leadingIcon={<CardIcon size={20} color={colors.textSecondary} />}
          />
        ) : (
          <View style={styles.paymentsList}>
            {payments.map((p) => {
              const payDate = p.date ?? p.paymentDate ?? p.createdAt ?? '';
              const txn = p.transactionId ?? p.reference ?? p.id ?? '';
              const truncatedTxn = txn.length > 12 ? `${txn.slice(0, 12)}…` : txn;
              return (
                <ListCard
                  key={p.id}
                  title={`${formatCurrency(p.amount)} · ${formatDate(payDate)}`}
                  subtitle={truncatedTxn || undefined}
                  leadingIcon={<CardIcon size={20} color={colors.textSecondary} />}
                />
              );
            })}
          </View>
        )}

        <PrimaryButton
          label={isPayable ? 'Pagar ahora' : `Al día · Próximo vencimiento ${formatDate(effectiveDueDate ?? undefined)}`}
          onPress={handlePay}
          disabled={!isPayable || isPaying}
        />      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, padding: layout.pagePadding },
  scrollContent: { padding: layout.pagePadding, paddingBottom: 40, gap: spacing.md },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  planName: { ...typography.h3, color: colors.text },
  planPrice: { ...typography.title, color: colors.primary, marginTop: 2 },
  statusLabel: { ...typography.caption, color: colors.textSecondary },
  dateText: { ...typography.caption, color: colors.textSecondary },
  sectionEyebrow: { ...typography.overline, color: colors.textSecondary, marginTop: spacing.sm },
  paymentsList: { gap: spacing.sm },
});
