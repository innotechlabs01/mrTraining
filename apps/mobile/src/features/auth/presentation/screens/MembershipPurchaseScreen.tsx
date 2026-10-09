import { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { showToast } from '../../../../../shared/components/ui/Toast';
import { purchaseMembership, getAvailablePlans } from '../../../../../features/auth/services/membershipService';
import { useClerkAuth } from '../../../../../features/auth/hooks/useClerkAuth';

interface MembershipPurchaseScreenProps {
  navigation: any;
  route: any;
}

export function MembershipPurchaseScreen({ navigation, route }: MembershipPurchaseScreenProps) {
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
        <ActivityIndicator size="large" />
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
      {/* Header con información del plan */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Seleccionar Plan</Text>
          <Text style={styles.headerSubtitle}>
            Elige el plan que mejor se adapte a ti
          </Text>
        </View>
        {route.goBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Regresar</Text>
          </TouchableOpacity>
        )}
      </View>

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
      <TouchableOpacity
        style={styles.buyButton}
        onPress={handlePurchase}
        disabled={isPaying}
      >
        <Text style={styles.buyButtonText}>
          {isPaying ? 'Procesando pago...' : 'Comprar Membresía'}
        </Text>
      </TouchableOpacity>

      {/* Opción para planes alternativos */}
      <View style={styles.alternativesSection} marginTop={20}>
        <Text style={styles.alternativesText}>
          Otros planes disponibles
        </Text>
        <TouchableOpacity
          style={styles.viewAllPlans}
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
    backgroundColor: '#0a0a0f',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#2a2a3a',
    backgroundColor: '#12121a',
  },
  headerLeft: {},
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#34d399',
    fontSize: 14,
  },
  planCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  planCardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  planCardDescription: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  planCardPrice: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  featuresSection: {
    margin: 20,
  },
  featuresTitle: {
    color: '#fff',
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
    color: '#34d399',
    fontSize: 12,
    marginRight: 6,
  },
  featureText: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  buyButton: {
    backgroundColor: '#34d399',
    padding: 16,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#0a0a0f',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noPlansContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPlansText: {
    color: '#666',
    fontSize: 16,
  },
  popularBadge: {
    backgroundColor: '#34d399',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  featuresSection: {
    margin: 20,
  },
  featuresTitle: {
    color: '#fff',
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
    color: '#34d399',
    fontSize: 12,
    marginRight: 6,
  },
  featureText: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  alternativesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  alternativesText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  viewAllLink: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '500',
  },
});