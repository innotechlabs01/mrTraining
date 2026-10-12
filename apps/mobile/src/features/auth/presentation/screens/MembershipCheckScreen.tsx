import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { showToast } from '../../../../shared/components/ui/Toast';
import { useClerkAuth } from '../../hooks/useClerkAuth';
import { colors, radius, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { getMembershipStatus, getAvailablePlans } from '../../services/membershipService';

interface MembershipCheckScreenProps {
  navigation: any;
  route: any;
}

export function MembershipCheckScreen({ navigation }: MembershipCheckScreenProps) {
  const { user, isLoading, isAuthenticated, error } = useClerkAuth();
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Array<{ plan: any; daysRemaining?: number }>>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const navigationRef = useNavigation();

  // Usar una ref para el navigate
  const nav = navigationRef;

  useEffect(() => {
    initCheck();
  }, [isAuthenticated, user?.id]);

  const initCheck = async () => {
    if (!isAuthenticated || !user?.id) {
      nav.replace('Auth');
      return;
    }

    setStatusLoading(true);
    try {
      // 1. Verificar estado actual de membership
      const status = await getMembershipStatus(user.id);
      
      if (status.hasActiveMembership) {
        // Ya tiene membership activa, ir a la app
        nav.replace('AthleteTabs', { screen: 'Home' });
        setStatusLoading(false);
        return;
      }

      // 2. Si no tiene membership, obtener planes disponibles
      const availablePlans = await getAvailablePlans(user.id);
      setPlans(availablePlans.map((plan: any) => ({
        plan,
        daysRemaining: status.daysRemaining,
      })));
      setStatusLoading(false);
    } catch (err: any) {
      console.error('Error en MembershipCheck:', err);
      showToast('error', 'Error', err.message || 'No se pudo verificar tu estado');
      setStatusLoading(false);
    }
  };

  const handlePlanSelect = async (plan: any) => {
    nav.navigate('MembershipPurchase', { plan });
  };

  if (isLoading) {
    return null; // Aún no termina de cargar el auth
  }

  if (statusLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verificando tu membresía...</Text>
      </View>
    );
  }

  if (hasMembership === false && plans.length === 0) {
    // Error state or no plans found
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No se pudieron cargar los planes. Por favor, inténtalo de nuevo.
        </Text>
        <PrimaryButton label="Volver a Sign In" onPress={() => nav.replace('Auth')} />
      </View>
    );
  }

  // Si ya tiene membership, no deberíamos estar aquí (handled arriba)
  // Si no tiene, mostramos los planes
  return (
    <View style={styles.container}>
      <ScreenHeader title="Selecciona tu plan" />
      {plans.length === 0 ? (
        <Text style={styles.emptyText}>
          No hay planes disponibles en este momento.
        </Text>
      ) : (
        plans.map((item, index) => {
          const { plan, daysRemaining } = item;
          const daysText = daysRemaining !== undefined && daysRemaining > 0
            ? `(${daysRemaining} días restantes)`
            : '';
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.planItem}
              onPress={() => handlePlanSelect(plan)}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {plan.isPopular && (
                  <Text style={styles.popularBadge}>Popular</Text>
                )}
              </View>
              <View style={styles.planDetails}>
                <Text style={styles.planDescription}>{plan.description}</Text>
                {daysText && (
                  <Text style={styles.daysText}>{daysText}</Text>
                )}
              </View>
              <View style={styles.planPrice}>
                <Text style={styles.planPriceAmount}>{plan.price}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
      <PrimaryButton
        label="Yo ya tengo una membresía"
        variant="outline"
        onPress={() => nav.replace('Auth')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
    padding: 20,
    gap: spacing.md,
  },
  errorText: {
    color: colors.error,
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
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    color: colors.text,
    fontSize: 18,
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
  planDetails: {
    marginBottom: spacing.sm,
  },
  planDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  daysText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '500',
  },
  planPrice: {
    marginTop: 'auto',
  },
  planPriceAmount: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});