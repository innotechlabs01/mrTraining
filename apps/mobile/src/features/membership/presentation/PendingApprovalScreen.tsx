import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../shared/theme/tokens';

type Props = {
  appointment?: {
    date: string;
    startTime: string;
    coachName: string;
  };
  onContactCoach: () => void;
};

export function PendingApprovalScreen({ appointment }: Props) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.statusCircle}>
          <Text style={styles.statusEmoji}>⏳</Text>
        </View>

        <Text style={styles.title}>Waiting for Approval</Text>
        <Text style={styles.body}>
          Your profile has been created. Your coach will review your routine before activating your account.
        </Text>

        {appointment && (
          <View style={styles.appointmentCard}>
            <Text style={styles.cardTitle}>Your Appointment</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Date</Text>
              <Text style={styles.cardValue}>{formatDate(appointment.date)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Time</Text>
              <Text style={styles.cardValue}>{appointment.startTime || 'TBD'}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Coach</Text>
              <Text style={styles.cardValue}>{appointment.coachName}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your coach will review your sport selections, goals, and experience level and activate your personalized plan.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  statusCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: `${colors.primary}15`, borderWidth: 2, borderColor: `${colors.primary}30`, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  statusEmoji: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  appointmentCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  cardDivider: { height: 1, backgroundColor: colors.border },
  cardLabel: { fontSize: 14, color: colors.textSecondary },
  cardValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  infoBox: { backgroundColor: `${colors.primary}08`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${colors.primary}15` },
  infoText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});
