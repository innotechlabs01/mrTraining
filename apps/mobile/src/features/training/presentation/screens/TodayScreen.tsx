import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMembership } from '../../../membership/presentation/MembershipGate';
import { tokens, typography } from '@shared/theme';

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
  nutrition: {
    meals: ['Breakfast: Oatmeal + Protein Shake', 'Lunch: Chicken + Rice + Veggies', 'Snack: Greek Yogurt + Almonds'],
  },
  recovery: { sleep: 7.5, hrv: 68, score: 85 },
};

export function TodayScreen() {
  const membership = useMembership();
  const t = MOCK_TODAY;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {membership.status === 'grace_period' && (
          <View style={styles.graceBanner}>
            <Text style={styles.graceIcon}>⚠️</Text>
            <View style={styles.graceTextWrap}>
              <Text style={styles.graceTitle}>Pago pendiente</Text>
              <Text style={styles.graceBody}>
                Tu membresia vence pronto. Paga antes de la fecha limite para evitar suspension.
              </Text>
            </View>
          </View>
        )}
        <Text style={styles.greeting}>Good morning, Athlete</Text>
        <Text style={styles.date}>{t.date}</Text>

        <View style={styles.readinessBar}>
          <View style={styles.readinessItem}>
            <Text style={styles.readinessValue}>85</Text>
            <Text style={styles.readinessLabel}>Readiness</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.readinessItem}>
            <Text style={styles.readinessValue}>{t.recovery.sleep}h</Text>
            <Text style={styles.readinessLabel}>Sleep</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.readinessItem}>
            <Text style={styles.readinessValue}>{t.recovery.hrv}</Text>
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
                  <Text style={styles.exerciseDetail}>{ex.sets} × {ex.reps} · Rest {ex.rest} · {ex.weight}</Text>
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
            {t.nutrition.meals.map((meal) => (
              <Text key={meal} style={styles.mealText}>{meal}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: tokens.spacing.lg, paddingBottom: 100 },
  greeting: { ...typography.title1, color: '#F5F5F7', fontWeight: '700' },
  date: { ...typography.footnote, color: '#98989D', marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.xl },
  readinessBar: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.md, marginBottom: tokens.spacing.xl, borderWidth: 1, borderColor: '#38383A' },
  readinessItem: { flex: 1, alignItems: 'center' },
  readinessValue: { ...typography.title3, color: '#FF8C3D', fontWeight: '700' },
  readinessLabel: { ...typography.caption, color: '#98989D', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#38383A' },
  section: { marginBottom: tokens.spacing.lg },
  sectionTitle: { ...typography.title2, color: '#F5F5F7', fontWeight: '700', marginBottom: tokens.spacing.md },
  workoutCard: { backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, borderWidth: 1, borderColor: '#38383A' },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.xs },
  workoutName: { ...typography.title3, color: '#F5F5F7', fontWeight: '600' },
  badge: { backgroundColor: '#FF8C3D20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: tokens.radius.sm },
  badgeText: { ...typography.caption, color: '#FF8C3D', fontWeight: '600' },
  workoutDuration: { ...typography.footnote, color: '#98989D', marginBottom: tokens.spacing.md },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: tokens.spacing.sm },
  exerciseBorder: { borderBottomWidth: 1, borderBottomColor: '#38383A' },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...typography.callout, color: '#F5F5F7', fontWeight: '500' },
  exerciseDetail: { ...typography.caption, color: '#6E6E73', marginTop: 2 },
  setIndicators: { flexDirection: 'row', gap: 4 },
  setDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38383A' },
  setDotDone: { backgroundColor: '#FF8C3D' },
  nutritionCard: { backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, borderWidth: 1, borderColor: '#38383A' },
  mealText: { ...typography.body, color: '#F5F5F7', marginBottom: 8, lineHeight: 24 },
  graceBanner: { flexDirection: 'row', backgroundColor: '#FF950020', borderRadius: tokens.radius.lg, padding: tokens.spacing.md, marginBottom: tokens.spacing.lg, borderWidth: 1, borderColor: '#FF950040', gap: 12 },
  graceIcon: { fontSize: 20 },
  graceTextWrap: { flex: 1 },
  graceTitle: { ...typography.callout, color: '#FF9500', fontWeight: '700', marginBottom: 2 },
  graceBody: { ...typography.footnote, color: '#FF9500', lineHeight: 18 },
});
