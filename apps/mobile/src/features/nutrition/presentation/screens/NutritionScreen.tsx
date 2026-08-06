import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens, typography } from '@shared/theme';

const MOCK_MEALS = [
  { meal: 'Breakfast', food: 'Oatmeal with banana + Whey Protein', calories: 450, protein: 35, carbs: 55, fat: 10 },
  { meal: 'Lunch', food: 'Grilled chicken breast + brown rice + steamed broccoli', calories: 620, protein: 48, carbs: 60, fat: 14 },
  { meal: 'Snack', food: 'Greek yogurt + almonds + honey', calories: 280, protein: 20, carbs: 22, fat: 12 },
  { meal: 'Dinner', food: 'Salmon fillet + sweet potato + asparagus', calories: 550, protein: 42, carbs: 45, fat: 18 },
];

export function NutritionScreen() {
  const totalCal = MOCK_MEALS.reduce((s, m) => s + m.calories, 0);
  const totalProtein = MOCK_MEALS.reduce((s, m) => s + m.protein, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nutrition</Text>

        <View style={styles.macroBar}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{totalCal}</Text>
            <Text style={styles.macroLabel}>kcal</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{totalProtein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>182g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>54g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>

        {MOCK_MEALS.map((m) => (
          <View key={m.meal} style={styles.card}>
            <Text style={styles.mealLabel}>{m.meal}</Text>
            <Text style={styles.mealFood}>{m.food}</Text>
            <View style={styles.mealMacros}>
              <Text style={styles.mealMacroText}>{m.calories} kcal</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.mealMacroText}>{m.protein}g protein</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.mealMacroText}>{m.carbs}g carbs</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.mealMacroText}>{m.fat}g fat</Text>
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
  macroBar: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.md, marginBottom: tokens.spacing.lg, borderWidth: 1, borderColor: '#38383A' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { ...typography.title3, color: '#FF8C3D', fontWeight: '700' },
  macroLabel: { ...typography.caption, color: '#98989D', marginTop: 2 },
  card: { backgroundColor: '#1C1C1E', borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, marginBottom: tokens.spacing.sm, borderWidth: 1, borderColor: '#38383A' },
  mealLabel: { ...typography.subhead, color: '#FF8C3D', fontWeight: '600', marginBottom: tokens.spacing.xs },
  mealFood: { ...typography.callout, color: '#F5F5F7', marginBottom: tokens.spacing.sm },
  mealMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mealMacroText: { ...typography.footnote, color: '#6E6E73' },
  dot: { color: '#6E6E73', fontSize: 13 },
});
