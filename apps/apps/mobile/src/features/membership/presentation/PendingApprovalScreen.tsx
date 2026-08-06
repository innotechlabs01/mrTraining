import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  appointment?: {
    date: string;
    startTime: string;
    coachName: string;
  };
  onContactCoach: () => void;
};

export function PendingApprovalScreen({ appointment, onContactCoach }: Props) {
  const formatDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.statusCircle}>
          <Text style={styles.statusEmoji}>⏳</Text>
        </View>

        <Text style={styles.title}>Waiting for Coach Approval</Text>
        <Text style={styles.body}>
          Your profile has been created and your coach will review your routine before activating your account.
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
              <Text style={styles.cardValue}>{appointment.startTime}</Text>
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
            💡 Your coach will review your sport selections, goals, and experience level during the call and activate your personalized plan.
          </Text>
        </View>

        <Pressable onPress={onContactCoach} style={styles.contactBtn}>
          <Text style={styles.contactText}>Contact Coach</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  statusCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FF8C3D15', borderWidth: 2, borderColor: '#FF8C3D30', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  statusEmoji: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#F5F5F7', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 16, color: '#98989D', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  appointmentCard: { backgroundColor: '#1C1C1E', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#38383A' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FF8C3D', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  cardDivider: { height: 1, backgroundColor: '#38383A' },
  cardLabel: { fontSize: 14, color: '#98989D' },
  cardValue: { fontSize: 14, color: '#F5F5F7', fontWeight: '600' },
  infoBox: { backgroundColor: '#FF8C3D08', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FF8C3D15' },
  infoText: { fontSize: 14, color: '#98989D', lineHeight: 20 },
  contactBtn: { backgroundColor: '#1C1C1E', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#38383A' },
  contactText: { fontSize: 16, fontWeight: '600', color: '#F5F5F7' },
});
