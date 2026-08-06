import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { apiClient } from '../../../infrastructure/api/client';
import { PaymentScreen } from './PaymentScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';

type MembershipState = {
  status: 'loading' | 'active' | 'grace_period' | 'suspended' | 'pending_approval' | 'no_membership' | 'error';
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
    if (!athleteId) { setState({ status: 'no_membership' }); return; }
    let cancelled = false;
    async function check() {
      try {
        const { data } = await apiClient.get(`/membership?athleteId=${athleteId}`);
        if (cancelled) return;
        if (!data || data.error) { setState({ status: 'no_membership' }); return; }
        setState({
          status: data.status,
          membership: {
            id: data.id, planName: data.planName, planPrice: data.planPrice,
            paymentDueDate: data.paymentDueDate, currentPeriodEnd: data.currentPeriodEnd,
            athleteId: data.athleteId, coachId: data.coachId,
          },
        });
      } catch { if (!cancelled) setState({ status: 'error' }); }
    }
    check();
    return () => { cancelled = true; };
  }, [athleteId]);

  if (state.status === 'loading') {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#FF6B00" /><Text style={styles.text}>Verifying membership...</Text></View>;
  }
  if (state.status === 'pending_approval') {
    return <PendingApprovalScreen appointment={state.membership ? { date: state.membership.currentPeriodEnd, startTime: '', coachName: 'Your Coach' } : undefined} onContactCoach={() => {}} />;
  }
  if (state.status === 'suspended') {
    return <PaymentScreen membership={state.membership!} />;
  }
  return <MembershipContext.Provider value={state}>{children}</MembershipContext.Provider>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  text: { color: '#98989D', marginTop: 16, fontSize: 15 },
});
