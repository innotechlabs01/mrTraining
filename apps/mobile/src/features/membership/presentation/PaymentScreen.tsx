import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '../../../shared/theme/tokens';
import { LockIcon } from '../../../shared/components/icons';
import { createCheckout } from '../../../features/polar/polarService';

type Props = {
  membership: {
    id: string; planName: string; planPrice: number;
    paymentDueDate: string; currentPeriodEnd: string;
    athleteId: string; coachId: string;
  };
};

export function PaymentScreen({ membership }: Props) {
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState(false);

  // Refresh after returning from the external Polar checkout browser.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        queryClient.invalidateQueries({ queryKey: ['athlete-membership'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const res = await createCheckout(membership.athleteId, membership.id);
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        Alert.alert('Checkout', 'Unable to start secure checkout.');
      }
    } catch (e) {
      console.error('Failed to start checkout', e);
      Alert.alert('Checkout', 'Something went wrong. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}><LockIcon size={36} color={colors.error} /></View>
        <Text style={styles.title}>Membership Expired</Text>
        <Text style={styles.subtitle}>
          Your plan <Text style={styles.highlight}>{membership.planName}</Text> expired on{' '}
          {formatDate(membership.currentPeriodEnd || membership.paymentDueDate)}.
          {'\n'}Please renew to continue training.
        </Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>{membership.planName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.infoValue}>${membership.planPrice} USD</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{formatDate(membership.paymentDueDate)}</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.payBtn, pressed && !isPaying && { opacity: 0.8 }, isPaying && { opacity: 0.6 }]} disabled={isPaying} onPress={handlePay}>
          <Text style={styles.payText}>{isPaying ? 'Processing...' : `Pay ${membership.planPrice} USD`}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.error}20`, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  iconText: { fontSize: 36 },
  title: { fontSize: 28, color: colors.text, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  highlight: { color: colors.primary, fontWeight: '600' },
  infoCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: `${colors.error}40` },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  infoLabel: { fontSize: 15, color: colors.textSecondary },
  infoValue: { fontSize: 15, color: colors.text, fontWeight: '600' },
  payBtn: { backgroundColor: colors.primary, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  payText: { fontSize: 17, color: colors.base, fontWeight: '700' },
});
