import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { smartClient as apiClient } from '../../../infrastructure/api/client';
import { PaymentScreen } from './PaymentScreen';
import { colors } from '../../../shared/theme/tokens';

type MembershipState = {
  status: 'loading' | 'active' | 'grace_period' | 'suspended' | 'pending_approval' | 'no_membership';
  membership?: {
    id: string;
    planName: string;
    planPrice: number;
    paymentDueDate: string;
    currentPeriodEnd: string;
    athleteId: string;
    coachId: string;
  };
};

const MembershipContext = createContext<MembershipState>({ status: 'loading' });

export function useMembership() {
  return useContext(MembershipContext);
}

export function MembershipGate({ children, athleteId }: { children: React.ReactNode; athleteId: string | null }) {
  const [state, setState] = useState<MembershipState>({ status: 'loading' });

  useEffect(() => {
    if (!athleteId) {
      // No athlete ID yet — still loading from Clerk
      return;
    }
    let cancelled = false;
    async function check() {
      try {
        const { data } = await apiClient.get('/athlete/membership');
        if (cancelled) return;

        // Go returns ListResponse {data:[...]} or single membership — handle both
        const membership = data?.data?.[0] ?? data?.membership ?? data;
        
        // New athlete or no membership — let them in
        if (!membership || membership.error || membership.status === 'no_membership') {
          setState({ status: 'active' });
          return;
        }

        // Suspended membership — show payment screen
        if (membership.status === 'suspended') {
          setState({
            status: 'suspended',
            membership: {
              id: membership.id, planName: membership.planName ?? membership.plan_name, planPrice: membership.planPrice ?? membership.plan_price,
              paymentDueDate: membership.paymentDueDate ?? membership.payment_due_date, currentPeriodEnd: membership.currentPeriodEnd ?? membership.current_period_end,
              athleteId: membership.athleteId ?? membership.athlete_id, coachId: membership.coachId ?? membership.coach_id,
            },
          });
          return;
        }

        // All other statuses — let them in
        setState({ status: membership.status || 'active' });
      } catch {
        // API error — don't block the user
        if (!cancelled) setState({ status: 'active' });
      }
    }
    check();
    return () => { cancelled = true; };
  }, [athleteId]);

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (state.status === 'suspended' && state.membership) {
    return <PaymentScreen membership={state.membership} />;
  }

  // All other states — let the user through
  return <MembershipContext.Provider value={state}>{children}</MembershipContext.Provider>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.base },
  text: { color: colors.textSecondary, marginTop: 16, fontSize: 15 },
});
