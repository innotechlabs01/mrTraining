import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { showToast } from '../../../../../shared/components/ui/Toast';
import { useClerkAuth } from '../../../../../features/auth/hooks/useClerkAuth';
import { getMembershipStatus, getAvailablePlans } from '../../../../../features/auth/services/membershipService';

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
        <ActivityIndicator size="large" />
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
        <TouchableOpacity style={styles.button} onPress={() => nav.replace('Auth')}>
          <Text style={styles.buttonText}>Volver a Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Si ya tiene membership, no deberíamos estar aquí (handled arriba)
  // Si no tiene, mostramos los planes
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tu plan</Text>
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
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => nav.replace('Auth')}
      >
        <Text style={styles.continueText}>Yo ya tengo una membresía</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff5f57',
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2a2a3a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  planItem: {
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  popularBadge: {
    backgroundColor: '#34d399',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  planDetails: {
    marginBottom: 8,
  },
  planDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  daysText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '500',
  },
  planPrice: {
    marginTop: 'auto',
  },
  planPriceAmount: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueButton: {
    marginTop: 20,
    backgroundColor: '#2a2a3a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});