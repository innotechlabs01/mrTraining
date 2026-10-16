import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { showToast } from '../../../../shared/components/ui/Toast';
import { purchaseMembership, getAvailablePlans, type Plan } from '../../services/membershipService';
import { useClerkAuth } from '../../hooks/useClerkAuth';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ListCard } from '../../../../shared/components/ui/ListCard';

type MembershipNavProp = NativeStackNavigationProp<RootStackParamList, 'Membership'>;

type Props = {
  navigation: MembershipNavProp;
};

export function MembershipPurchaseScreen({ navigation }: Props) {
  const { user } = useClerkAuth();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const initData = useCallback(async () => {
    if (!user?.id) {
      navigation.replace('Auth');
      return;
    }
    setIsLoading(true);
    try {
      const fetched = await getAvailablePlans(user.id);
      if (fetched.length > 0) {
        setSelectedPlan(fetched[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudieron cargar los planes';
      showToast('error', 'Error', msg);
      navigation.replace('MembershipCheck');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, navigation]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan || !user?.id) return;
    setIsPaying(true);
    try {
      const result = await purchaseMembership(user.id, selectedPlan.id);
      if (result.status === 'active') {
        showToast('success', '¡Éxito!', result.message || 'Membresía activada');
        navigation.replace('AthleteTabs');
      } else {
        showToast('warning', 'Atención', result.message || 'Procesando…');
        setIsPaying(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago';
      showToast('error', 'Error', msg);
      setIsPaying(false);
    }
  }, [selectedPlan, user?.id, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando planes…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const plan = selectedPlan;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Seleccionar plan" onBack={() => navigation.goBack()} />

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>{plan?.name ?? ''}</Text>
          {plan?.isPopular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
          <Text style={styles.planDescription}>{plan?.description ?? ''}</Text>
          <Text style={styles.planPrice}>{plan?.price ?? ''}</Text>
        </View>

        <Text style={styles.featuresTitle}>Incluye</Text>
        <View style={styles.featuresList}>
          {plan?.features.map((feature, index) => (
            <ListCard
              key={index}
              title={feature}
              leadingIcon={<View style={styles.checkWrap} />}
              last={index === (plan?.features.length ?? 1) - 1}
            />
          ))}
        </View>

        <PrimaryButton
          label={isPaying ? 'Procesando pago…' : 'Comprar membresía'}
          onPress={handlePurchase}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  planTitle: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.text,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.primary}33`,
  },
  popularText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  planDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  planPrice: {
    ...typography.title,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  featuresTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  featuresList: { gap: spacing.sm },
  checkWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.success}15`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
