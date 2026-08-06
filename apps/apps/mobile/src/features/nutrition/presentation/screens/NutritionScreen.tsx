import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MEALS = [
  { meal: 'Breakfast', food: 'Oatmeal with banana + Whey Protein', calories: 450, protein: 35, carbs: 55, fat: 10 },
  { meal: 'Lunch', food: 'Grilled chicken breast + brown rice + broccoli', calories: 620, protein: 48, carbs: 60, fat: 14 },
  { meal: 'Snack', food: 'Greek yogurt + almonds + honey', calories: 280, protein: 20, carbs: 22, fat: 12 },
  { meal: 'Dinner', food: 'Salmon fillet + sweet potato + asparagus', calories: 550, protein: 42, carbs: 45, fat: 18 },
];

export function NutritionScreen() {
  const totalCal = MEALS.reduce((s, m) => s + m.calories, 0);
  const totalProtein = MEALS.reduce((s, m) => s + m.protein, 0);

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
        {MEALS.map((m) => (
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
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 28, color: '#F5F5F7', fontWeight: '700', marginBottom: 24 },
  macroBar: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#38383A' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 20, color: '#FF8C3D', fontWeight: '700' },
  macroLabel: { fontSize: 12, color: '#98989D', marginTop: 2 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, marginBottom: 8, borderWidth: 1, borderColor: '#38383A' },
  mealLabel: { fontSize: 15, color: '#FF8C3D', fontWeight: '600', marginBottom: 4 },
  mealFood: { fontSize: 16, color: '#F5F5F7', marginBottom: 8 },
  mealMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mealMacroText: { fontSize: 13, color: '#6E6E73' },
  dot: { color: '#6E6E73', fontSize: 13 },
});
