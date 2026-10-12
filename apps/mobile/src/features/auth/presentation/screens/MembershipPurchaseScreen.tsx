import { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { showToast } from '../../../../shared/components/ui/Toast';
import { purchaseMembership, getAvailablePlans } from '../../services/membershipService';
import { useClerkAuth } from '../../hooks/useClerkAuth';
import { colors, radius, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';

interface MembershipPurchaseScreenProps {
  navigation: any;
}

export function MembershipPurchaseScreen({ navigation }: MembershipPurchaseScreenProps) {
  const { user } = useClerkAuth();
  const [plans, setPlans] = useState<Array<{ plan: any; daysRemaining?: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const navigationRef = useNavigation();
  const routeInfo = useRoute();

  // El plan podría venir por route params o por estado
  const routePlan = routeInfo.params?.plan;

  useEffect(() => {
    initData();
  }, [routePlan]);

  const initData = async () => {
    if (!user?.id) {
      navigationRef.replace('Auth');
      return;
    }

    setIsLoading(true);
    try {
      // Si venimos de MembershipCheck y ya hay planes, úsalos
      if (routePlan && routePlan.id) {
        const existingPlans = plans.filter((p: any) => p.plan.id === routePlan.id);
        if (existingPlans.length > 0) {
          setSelectedPlan(existingPlans[0]);
          setIsLoading(false);
          return;
        }
      }

      // Si no, obtener planes fresh desde el Go API
      const fetchedPlans = await getAvailablePlans(user.id);
      setPlans(fetchedPlans.map((plan: any) => ({
        plan,
        daysRemaining: undefined,
      })));

      // Seleccionar el primer plan por defecto si no hay ninguno seleccionado
      if (!selectedPlan && fetchedPlans.length > 0) {
        setSelectedPlan({ plan: fetchedPlans[0], daysRemaining: undefined });
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error cargando planes:', err);
      showToast('error', 'Error', err.message || 'No se pudieron cargar los planes');
      setIsLoading(false);
      navigationRef.replace('MembershipCheck');
    }
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan({ plan });
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !user?.id) return;

    setIsPaying(true);
    try {
      const result = await purchaseMembership(user.id, selectedPlan.plan.id);

      if (result.status === 'active') {
        // Membresía activada exitosamente
        showToast('success', '¡Éxito!', result.message || 'Membresía activada');
        navigationRef.replace('AthleteTabs', { screen: 'Home' });
      } else {
        showToast('warning', 'Atención', result.message || 'Procesando...');
        // Podríamos mostrar un estado de "trial" o pending
        setIsPaying(false);
      }
    } catch (err: any) {
      console.error('Error en compra:', err);
      showToast('error', 'Error', err.message || 'Error al procesar el pago');
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando planes...</Text>
      </View>
    );
  }

  if (!selectedPlan) {
    // Si no hay planes disponibles o error, volver
    setTimeout(() => navigationRef.replace('MembershipCheck'), 2000);
    return (
      <View style={styles.noPlansContainer}>
        <Text style={styles.noPlansText}>
          No hay planes disponibles en este momento.
        </Text>
      </View>
    );
  }

  const plan = selectedPlan.plan;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Seleccionar Plan"
        subtitle="Elige el plan que mejor se adapte a ti"
        onBack={() => navigation.goBack()}
      />

      {/* Detalles del plan seleccionado */}
      <View style={styles.planCard}>
        <Text style={styles.planCardTitle}>{plan.name}</Text>
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.badgeText}>Recomendado</Text>
          </View>
        )}
        <Text style={styles.planCardDescription}>{plan.description}</Text>
        <Text style={styles.planCardPrice}>{plan.price}</Text>
      </View>

      {/* Características del plan */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>Incluye:</Text>
        <View style={styles.featuresList}>
          {plan.features.map((feature: string, index: number) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Botón de compra */}
      <PrimaryButton
        label={isPaying ? 'Procesando pago...' : 'Comprar Membresía'}
        onPress={handlePurchase}
        loading={isPaying}
        style={styles.buyButtonSpacing}
      />

      {/* Opción para planes alternativos */}
      <View style={styles.alternativesSection}>
        <Text style={styles.alternativesText}>
          Otros planes disponibles
        </Text>
        <TouchableOpacity
          onPress={() => navigationRef.navigate('MembershipPlansList')}
        >
          <Text style={styles.viewAllLink}>
            Ver todos los planes {'>'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
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
  planCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  planCardDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  planCardPrice: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  featuresSection: {
    margin: 20,
  },
  featuresTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  featuresList: {},
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureIcon: {
    color: colors.success,
    fontSize: 12,
    marginRight: 6,
  },
  featureText: {
    color: colors.text,
    fontSize: 14,
  },
  buyButtonSpacing: {
    margin: 20,
  },
  noPlansContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
    padding: 20,
  },
  noPlansText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  popularBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  alternativesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  alternativesText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  viewAllLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});