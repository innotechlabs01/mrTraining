import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { PaymentScreen } from './PaymentScreen';
import { colors } from '../../../shared/theme/tokens';
import { texts } from '../../../shared/i18n/texts';
import { getMembershipStatus, type MembershipSummary } from '../../auth/services/membershipService';

type MembershipState = {
  status: 'loading' | 'active' | 'trial' | 'past_due' | 'suspended' | 'no_membership' | 'error';
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

const MembershipContext = createContext<MembershipState>({
  status: 'loading',
});

export function useMembership() {
  return useContext(MembershipContext);
}

function buildMembershipState(
  status: MembershipState['status'],
  membership: MembershipSummary | null | undefined
): MembershipState {
  const base: MembershipState = { status };
  if (membership) {
    base.membership = {
      id: membership.id,
      planName: membership.planName,
      planPrice: membership.planPrice,
      paymentDueDate: membership.paymentDueDate,
      currentPeriodEnd: membership.currentPeriodEnd,
      athleteId: membership.athleteId,
      coachId: membership.coachId,
    };
  }
  return base;
}

/**
 * MembershipGate — fail-closed.
 *
 * Nunca deja pasar sin membresía válida.
 * - loading: muestra ActivityIndicator
 * - no_membership / none: bloquea, muestra PaymentScreen
 * - suspended: bloquea, muestra PaymentScreen
 * - error: bloquea, muestra estado de error
 * - active / trial / past_due: permite acceso (renderiza children)
 */
export function MembershipGate({ children, athleteId }: { children: React.ReactNode; athleteId: string | null }) {
  const [state, setState] = useState<MembershipState>({ status: 'loading' });

  useEffect(() => {
    if (!athleteId) {
      return;
    }
    let cancelled = false;
    async function check() {
      try {
        const membership = await getMembershipStatus();
        if (cancelled) return;

        switch (membership.status) {
          case 'active':
          case 'trial':
          case 'past_due':
            // Membresía válida — permitir acceso
            if (!cancelled) {
              setState(buildMembershipState(membership.status, membership.membership));
            }
            return;

          case 'suspended':
          case 'no_membership':
          case 'none':
            // No membresía válida — bloquear, mostrar PaymentScreen
            if (!cancelled) {
              setState(buildMembershipState(membership.status === 'none' ? 'no_membership' : membership.status, membership.membership));
            }
            return;

          default:
            if (!cancelled) {
              setState({ status: 'no_membership' });
            }
            return;
        }
      } catch {
        // API error — bloquear (fail-closed, nunca fallar abierto)
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, [athleteId]);

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>{texts.common.loading}</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>{texts.screens.membershipScreen.unavailable}</Text>
      </View>
    );
  }

  // suspended / no_membership — bloquear, mostrar pantalla de compra.
  // Siempre bloquear: fail-closed, nunca dejar pasar sin membresía válida.
  if (state.status === 'suspended' || state.status === 'no_membership') {
    const m: NonNullable<MembershipState['membership']> = state.membership ?? {
      id: '',
      planName: '',
      planPrice: 0,
      paymentDueDate: '',
      currentPeriodEnd: '',
      athleteId: athleteId ?? '',
      coachId: '',
    };
    return <PaymentScreen membership={m} />;
  }

  // active / trial / past_due — permitir acceso
  return (
    <MembershipContext.Provider value={state}>{children}</MembershipContext.Provider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.base },
  text: { color: colors.textSecondary, marginTop: 16, fontSize: 15 },
});
