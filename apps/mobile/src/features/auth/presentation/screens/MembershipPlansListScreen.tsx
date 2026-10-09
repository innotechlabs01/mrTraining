import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { showToast } from '../../../../../shared/components/ui/Toast';
import { getAvailablePlans } from '../../../../../features/auth/services/membershipService';
import { useClerkAuth } from '../../../../../features/auth/hooks/useClerkAuth';

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
      const fetchedPlans = await getAvailablePlans(user.id);
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
        <ActivityIndicator size="large" />
        <Text>{'Cargando planes...'}</Text>
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
      <Text style={styles.title}>Mis Planes de Membresía</Text>
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
        </View>
      ))}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => navigation.replace('MembershipCheck')}
      >
        <Text style={styles.continueText}>Ver estado actual</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
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
    fontSize: 16,
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
  planDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  planPrice: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
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
    fontSize: 14,
  },
});