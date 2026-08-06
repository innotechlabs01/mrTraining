import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens, typography } from '@shared/theme';

const MOCK_HISTORY = [
  { date: 'Aug 5 — Monday', name: 'Lower Body Power', focus: 'Squat Focus', exercises: 4, sets: 16, completed: true },
  { date: 'Aug 3 — Saturday', name: 'Speed & Agility', focus: 'Running', exercises: 5, sets: 18, completed: true },
  { date: 'Aug 1 — Thursday', name: 'Upper Body Push', focus: 'Strength', exercises: 4, sets: 14, completed: true },
  { date: 'Jul 30 — Tuesday', name: 'Full Body HIIT', focus: 'Conditioning', exercises: 6, sets: 24, completed: true },
  { date: 'Jul 28 — Sunday', name: 'Recovery + Mobility', focus: 'Flexibility', exercises: 3, sets: 9, completed: true },
];

export function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Training History</Text>

        {MOCK_HISTORY.map((w) => (
          <View key={w.date} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.workoutName}>{w.name}</Text>
                <Text style={styles.workoutDate}>{w.date}</Text>
              </View>
              <View style={styles.checkBadge}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            </View>
            <View style={styles.stats}>
              <Text style={styles.statText}>{w.exercises} exercises</Text>
              <Text style={styles.statDot}>·</Text>
              <Text style={styles.statText}>{w.sets} sets</Text>
              <Text style={styles.statDot}>·</Text>
              <View style={styles.focusBadge}>
                <Text style={styles.focusText}>{w.focus}</Text>
              </View>
            </View>
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
  card: { backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, marginBottom: tokens.spacing.sm, borderWidth: 1, borderColor: '#38383A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.sm },
  workoutName: { ...typography.callout, color: '#F5F5F7', fontWeight: '600' },
  workoutDate: { ...typography.caption, color: '#98989D', marginTop: 2 },
  checkBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
  checkText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { ...typography.footnote, color: '#6E6E73' },
  statDot: { color: '#6E6E73', fontSize: 13 },
  focusBadge: { backgroundColor: '#FF8C3D20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: tokens.radius.sm },
  focusText: { ...typography.caption, color: '#FF8C3D', fontWeight: '600' },
});
