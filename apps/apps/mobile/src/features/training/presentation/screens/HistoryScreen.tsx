import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HISTORY = [
  { date: 'Aug 5 — Mon', name: 'Lower Body Power', focus: 'Squat Focus', exercises: 4, sets: 16 },
  { date: 'Aug 3 — Sat', name: 'Speed & Agility', focus: 'Running', exercises: 5, sets: 18 },
  { date: 'Aug 1 — Thu', name: 'Upper Body Push', focus: 'Strength', exercises: 4, sets: 14 },
  { date: 'Jul 30 — Tue', name: 'Full Body HIIT', focus: 'Conditioning', exercises: 6, sets: 24 },
  { date: 'Jul 28 — Sun', name: 'Recovery + Mobility', focus: 'Flexibility', exercises: 3, sets: 9 },
];

export function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Training History</Text>
        {HISTORY.map((w) => (
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
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 28, color: '#F5F5F7', fontWeight: '700', marginBottom: 24 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, marginBottom: 8, borderWidth: 1, borderColor: '#38383A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  workoutName: { fontSize: 16, color: '#F5F5F7', fontWeight: '600' },
  workoutDate: { fontSize: 12, color: '#98989D', marginTop: 2 },
  checkBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
  checkText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: '#6E6E73' },
  statDot: { color: '#6E6E73', fontSize: 13 },
  focusBadge: { backgroundColor: '#FF8C3D20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  focusText: { fontSize: 12, color: '#FF8C3D', fontWeight: '600' },
});
