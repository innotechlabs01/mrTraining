import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { AlertBanner } from '../../../../shared/components/ui/AlertBanner';
import { showToast } from '../../../../shared/components/ui/Toast';
import { useClerkAuth } from '../../hooks/useClerkAuth';
import { getMembershipStatus, getAvailablePlans, type Plan } from '../../services/membershipService';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.membershipScreen;

type MembershipNavProp = NativeStackNavigationProp<RootStackParamList, 'Membership'>;

type Props = {
  navigation: MembershipNavProp;
};

export function MembershipCheckScreen({ navigation }: Props) {
  const { user, isLoading, isAuthenticated } = useClerkAuth();
  const [status, setStatus] = useState<'loading' | 'active' | 'no_membership' | 'error'>('loading');
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      navigation.replace('Auth');
      return;
    }
    checkMembership();
  }, [isAuthenticated, user?.id, navigation]);

  const checkMembership = useCallback(async () => {
    setStatus('loading');
    if (!user?.id) return;
    try {
      const membership = await getMembershipStatus(user.id);
      if (membership.hasActiveMembership) {
        setStatus('active');
        navigation.replace('AthleteTabs');
        return;
      }
      const available = await getAvailablePlans(user.id);
      setPlans(available);
      setStatus('no_membership');
    } catch (err: unknown) {
      console.error('Error en MembershipCheck:', err);
      setStatus('error');
      showToast('error', 'Error', err instanceof Error ? err.message : 'No se pudo verificar tu estado');
    }
  }, [user?.id, navigation]);

  if (isLoading || !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verificando tu membresía…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertBanner
            tone="error"
            title="No se pudo verificar tu membresía"
            message="Intenta de nuevo en unos momentos."
            actionLabel="Reintentar"
            onAction={checkMembership}
          />
          <PrimaryButton label="Volver a Sign In" onPress={() => navigation.replace('Auth')} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'active') {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.planTitle} onBack={() => navigation.replace('Auth')} />

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Elige tu plan</Text>
          <Text style={styles.heroSubtitle}>
            Selecciona el plan que mejor se adapte a tu entrenamiento.
          </Text>
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t.unavailable}</Text>
            <PrimaryButton
              label="Volver a Sign In"
              onPress={() => navigation.replace('Auth')}
              variant="outline"
            />
          </View>
        ) : (
          <View style={styles.plansList}>
            {plans.map((plan, index) => {
              const isPopular = plan.isPopular;
              return (
                <ListCard
                  key={plan.id}
                  title={plan.name}
                  subtitle={plan.description}
                  leadingIcon={
                    <View style={styles.popularBadge}>
                      {isPopular && <Text style={styles.popularText}>Popular</Text>}
                    </View>
                  }
                  trailing={
                    <View style={styles.priceWrap}>
                      <Text style={styles.price}>{plan.price}</Text>
                    </View>
                  }
                  onPress={() => navigation.navigate('MembershipPurchase', { plan })}
                  last={index === plans.length - 1}
                />
              );
            })}
          </View>
        )}

        <PrimaryButton
          label="Yo ya tengo una membresía"
          onPress={() => navigation.replace('Auth')}
          variant="outline"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.pagePadding,
    gap: spacing.lg,
  },
  scrollContent: {
    padding: layout.pagePadding,
    paddingBottom: spacing.lg * 2,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.text,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  plansList: { gap: spacing.sm },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  popularText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    ...typography.bodyBold,
    color: colors.primary,
    fontWeight: '700',
  },
});
