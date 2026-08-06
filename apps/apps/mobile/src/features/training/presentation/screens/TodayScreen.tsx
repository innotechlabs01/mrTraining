import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_TODAY = {
  date: 'Today — Thursday, August 6',
  mainWorkout: {
    name: 'Upper Body Strength',
    focus: 'Push Focus',
    duration: '55 min',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8', rest: '90s', weight: '60kg' },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10', rest: '60s', weight: '20kg' },
      { name: 'Tricep Dips', sets: 3, reps: '12', rest: '45s', weight: 'BW' },
      { name: 'Lateral Raises', sets: 3, reps: '15', rest: '45s', weight: '8kg' },
    ],
  },
};

export function TodayScreen() {
  const t = MOCK_TODAY;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Good morning, Athlete</Text>
        <Text style={styles.date}>{t.date}</Text>

        <View style={styles.readinessBar}>
          <View style={styles.readinessItem}>
            <Text style={styles.readinessValue}>85</Text>
            <Text style={styles.readinessLabel}>Readiness</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.readinessItem}>
            <Text style={styles.readinessValue}>7.5h</Text>
            <Text style={styles.readinessLabel}>Sleep</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.readinessItem}>
            <Text style={styles.readinessValue}>68</Text>
            <Text style={styles.readinessLabel}>HRV</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Workout</Text>
          <View style={styles.workoutCard}>
            <View style={styles.workoutHeader}>
              <Text style={styles.workoutName}>{t.mainWorkout.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t.mainWorkout.focus}</Text>
              </View>
            </View>
            <Text style={styles.workoutDuration}>{t.mainWorkout.duration}</Text>

            {t.mainWorkout.exercises.map((ex, i) => (
              <View key={ex.name} style={[styles.exerciseRow, i < t.mainWorkout.exercises.length - 1 && styles.exerciseBorder]}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseDetail}>{ex.sets} x {ex.reps} · Rest {ex.rest} · {ex.weight}</Text>
                </View>
                <View style={styles.setIndicators}>
                  {Array.from({ length: ex.sets }).map((_, j) => (
                    <View key={j} style={[styles.setDot, j === 0 && styles.setDotDone]} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Today</Text>
          <View style={styles.nutritionCard}>
            <Text style={styles.mealText}>🥣 Breakfast: Oatmeal + Protein Shake</Text>
            <Text style={styles.mealText}>🍗 Lunch: Chicken + Rice + Veggies</Text>
            <Text style={styles.mealText}>🥜 Snack: Greek Yogurt + Almonds</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingBottom: 100 },
  greeting: { fontSize: 28, lineHeight: 34, color: '#F5F5F7', fontWeight: '700' },
  date: { fontSize: 13, color: '#98989D', marginTop: 8, marginBottom: 24 },
  readinessBar: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#38383A' },
  readinessItem: { flex: 1, alignItems: 'center' },
  readinessValue: { fontSize: 20, color: '#FF8C3D', fontWeight: '700' },
  readinessLabel: { fontSize: 12, color: '#98989D', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#38383A' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 22, color: '#F5F5F7', fontWeight: '700', marginBottom: 16 },
  workoutCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#38383A' },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  workoutName: { fontSize: 20, color: '#F5F5F7', fontWeight: '600' },
  badge: { backgroundColor: '#FF8C3D20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, color: '#FF8C3D', fontWeight: '600' },
  workoutDuration: { fontSize: 13, color: '#98989D', marginBottom: 16 },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  exerciseBorder: { borderBottomWidth: 1, borderBottomColor: '#38383A' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, color: '#F5F5F7', fontWeight: '500' },
  exerciseDetail: { fontSize: 12, color: '#6E6E73', marginTop: 2 },
  setIndicators: { flexDirection: 'row', gap: 4 },
  setDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38383A' },
  setDotDone: { backgroundColor: '#FF8C3D' },
  nutritionCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#38383A' },
  mealText: { fontSize: 17, color: '#F5F5F7', marginBottom: 8, lineHeight: 24 },
});
