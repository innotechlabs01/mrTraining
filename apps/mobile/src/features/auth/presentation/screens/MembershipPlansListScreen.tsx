import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { showToast } from '../../../../shared/components/ui/Toast';
import { getAvailablePlans } from '../../services/membershipService';
import { useClerkAuth } from '../../hooks/useClerkAuth';
import { colors, radius, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';

export function MembershipPlansListScreen({ navigation }: any) {
  const { user } = useClerkAuth();
  const [plans, setPlans] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigationRef = useNavigation();

  useEffect(() => {
    initPlans();
  }, [user?.id]);

  const initPlans = async () => {
    if (!user?.id) {
      navigation.replace('Auth');
      return;
    }

    setIsLoading(true);
    try {
      const fetchedPlans = await getAvailablePlans();
      setPlans(fetchedPlans);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      showToast('error', 'Error', 'No se pudieron cargar los planes');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{'Cargando planes...'}</Text>
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          No hay planes disponibles en este momento.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mis Planes de Membresía" />
      {plans.map((plan: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={styles.planItem}
          onPress={() =>
            navigation.navigate('MembershipPurchase', { plan })
          }
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.isPopular && (
              <Text style={styles.popularBadge}>Popular</Text>
            )}
          </View>
          <Text style={styles.planDescription}>
            {plan.description}
          </Text>
          <Text style={styles.planPrice}>{plan.price}</Text>
        </TouchableOpacity>
      ))}
      <PrimaryButton
        label="Ver estado actual"
        onPress={() => navigation.replace('MembershipCheck')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
    padding: 20,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  planItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  popularBadge: {
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  planDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  planPrice: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});