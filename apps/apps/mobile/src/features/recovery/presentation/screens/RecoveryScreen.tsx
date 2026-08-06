import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RECOVERY = {
  readiness: { score: 85, status: 'Ready to Train' },
  sleep: { hours: 7.5, quality: 'Good', deep: '2h 15m', rem: '1h 50m' },
  hrv: { value: 68, trend: '+5 from yesterday' },
  recommendations: [
    'Foam roll quads and hamstrings for 10 minutes',
    'Cold shower or ice bath for recovery',
    'Focus on hydration — aim for 3L today',
    'Yoga flow before bed for better sleep quality',
  ],
};

export function RecoveryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recovery</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{RECOVERY.readiness.score}</Text>
          </View>
          <Text style={styles.scoreLabel}>{RECOVERY.readiness.status}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{RECOVERY.sleep.hours}h</Text>
            <Text style={styles.statLabel}>Sleep</Text>
            <Text style={styles.statDetail}>Deep {RECOVERY.sleep.deep}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{RECOVERY.hrv.value}</Text>
            <Text style={styles.statLabel}>HRV</Text>
            <Text style={styles.statDetail}>{RECOVERY.hrv.trend}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recommendations</Text>
        {RECOVERY.recommendations.map((rec, i) => (
          <View key={i} style={styles.recCard}>
            <View style={styles.recBullet} />
            <Text style={styles.recText}>{rec}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 28, color: '#F5F5F7', fontWeight: '700', marginBottom: 24 },
  scoreCard: { alignItems: 'center', marginBottom: 32 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  scoreValue: { fontSize: 36, color: '#FFF', fontWeight: '800' },
  scoreLabel: { fontSize: 20, color: '#34C759', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#38383A' },
  statValue: { fontSize: 28, color: '#FF8C3D', fontWeight: '700' },
  statLabel: { fontSize: 13, color: '#98989D', marginTop: 2 },
  statDetail: { fontSize: 12, color: '#6E6E73', marginTop: 4 },
  sectionTitle: { fontSize: 22, color: '#F5F5F7', fontWeight: '700', marginBottom: 16 },
  recCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#38383A', gap: 8 },
  recBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8C3D', marginTop: 6 },
  recText: { fontSize: 17, color: '#F5F5F7', flex: 1, lineHeight: 22 },
});
