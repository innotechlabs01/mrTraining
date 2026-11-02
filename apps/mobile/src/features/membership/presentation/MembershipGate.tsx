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
 * - no_membership / none: bloquea, llama onNoMembership (navegar a planes de compra)
 * - suspended: bloquea, muestra PaymentScreen (renovar plan existente)
 * - error: bloquea, muestra estado de error
 * - active / trial / past_due: permite acceso (renderiza children)
 */
export function MembershipGate({
  children,
  athleteId,
  onNoMembership,
}: {
  children: React.ReactNode;
  athleteId: string | null;
  onNoMembership?: () => void;
}) {
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
            // Membresía suspendida — bloquear, mostrar PaymentScreen para renovar
            if (!cancelled) {
              setState(buildMembershipState(membership.status, membership.membership));
            }
            return;

          case 'no_membership':
          case 'none':
            // No hay membresía — bloquear y notificar al padre para navegar a planes de compra
            if (!cancelled) {
              setState({ status: 'no_membership' });
              onNoMembership?.();
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

  // suspended — bloquear, mostrar PaymentScreen para renovar plan existente
  if (state.status === 'suspended') {
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

  // no_membership — bloquear, navegar a pantalla de planes (ya notificado vía onNoMembership)
  if (state.status === 'no_membership') {
    return null;
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
