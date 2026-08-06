import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens, typography } from '@shared/theme';

const MOCK_RECOVERY = {
  sleep: { hours: 7.5, quality: 'Good', deep: '2h 15m', rem: '1h 50m' },
  readiness: { score: 85, status: 'Ready to Train' },
  hrv: { value: 68, trend: '+5 from yesterday' },
  recommendations: [
    'Foam roll quads and hamstrings for 10 minutes',
    'Cold shower or ice bath for recovery',
    'Focus on hydration — aim for 3L today',
    'Yoga flow before bed for better sleep quality',
  ],
};

export function RecoveryScreen() {
  const r = MOCK_RECOVERY;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recovery</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{r.readiness.score}</Text>
          </View>
          <Text style={styles.scoreLabel}>{r.readiness.status}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{r.sleep.hours}h</Text>
            <Text style={styles.statLabel}>Sleep</Text>
            <Text style={styles.statDetail}>Deep {r.sleep.deep}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{r.hrv.value}</Text>
            <Text style={styles.statLabel}>HRV</Text>
            <Text style={styles.statDetail}>{r.hrv.trend}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recommendations</Text>
        {r.recommendations.map((rec, i) => (
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
  content: { padding: tokens.spacing.lg, paddingBottom: 100 },
  title: { ...typography.title1, color: '#F5F5F7', fontWeight: '700', marginBottom: tokens.spacing.lg },
  scoreCard: { alignItems: 'center', marginBottom: tokens.spacing.xl },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: tokens.spacing.sm },
  scoreValue: { fontSize: 36, color: '#FFF', fontWeight: '800' },
  scoreLabel: { ...typography.title3, color: '#34C759', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl },
  statCard: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, borderWidth: 1, borderColor: '#38383A' },
  statValue: { ...typography.title1, color: '#FF8C3D', fontWeight: '700' },
  statLabel: { ...typography.footnote, color: '#98989D', marginTop: 2 },
  statDetail: { ...typography.caption, color: '#6E6E73', marginTop: 4 },
  sectionTitle: { ...typography.title2, color: '#F5F5F7', fontWeight: '700', marginBottom: tokens.spacing.md },
  recCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1C1C1E', borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginBottom: tokens.spacing.sm, borderWidth: 1, borderColor: '#38383A', gap: tokens.spacing.sm },
  recBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8C3D', marginTop: 6 },
  recText: { ...typography.body, color: '#F5F5F7', flex: 1, lineHeight: 22 },
});
