import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core';
type Exercise = { id: string; name: string; sets: string; reps: string };
const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];
type Nav = NativeStackNavigationProp<RootStackParamList>;

function ExerciseRow({ exercise, onUpdate }: { exercise: Exercise; onUpdate: (id: string, field: 'sets' | 'reps', value: string) => void }) {
  return (
    <View style={s.exerciseRow}>
      <Text style={s.exerciseName} numberOfLines={1}>{exercise.name}</Text>
      <View style={s.exerciseInputs}>
        {(['sets', 'reps'] as const).map((field) => (
          <View key={field} style={s.inputGroup}>
            <Text style={s.inputLabel}>{field.toUpperCase()}</Text>
            <TextInput
              value={exercise[field]}
              onChangeText={(v) => onUpdate(exercise.id, field, v)}
              keyboardType="numeric"
              style={s.smallInput}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CreateRoutineScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [routineName, setRoutineName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<MuscleGroup[]>(['Chest']);
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: 'Bench Press', sets: '4', reps: '12' },
  ]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/athlete/routines', {
        name: routineName,
        muscleGroups: selectedGroups,
        exercises: exercises.map((ex) => ({
          name: ex.name,
          sets: parseInt(ex.sets, 10) || 0,
          reps: parseInt(ex.reps, 10) || 0,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'No se pudo guardar la rutina. Intenta de nuevo.'),
  });

  const toggleGroup = (g: MuscleGroup) =>
    setSelectedGroups((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const updateExercise = (id: string, field: 'sets' | 'reps', value: string) =>
    setExercises((p) => p.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));

  const addExercise = () =>
    setExercises((p) => [...p, { id: String(p.length + 1), name: 'New Exercise', sets: '3', reps: '10' }]);

  const canSave = routineName.trim().length > 0 && exercises.length > 0 && !saveMutation.isPending;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12} style={s.backButton}>
          <Text style={s.backChevron}>{'\u2039'}</Text>
        </Pressable>
        <Text style={s.headerTitle}>Create Your Routine</Text>
        <View style={s.headerRight} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.label}>Routine Name</Text>
        <TextInput value={routineName} onChangeText={setRoutineName} placeholder="Enter routine name" placeholderTextColor={colors.textSecondary} style={s.nameInput} />

        <Text style={s.label}>Muscle Groups</Text>
        <View style={s.chipRow}>
          {MUSCLE_GROUPS.map((group) => {
            const sel = selectedGroups.includes(group);
            return (
              <Pressable key={group} onPress={() => toggleGroup(group)} style={[s.chip, sel ? s.chipSelected : s.chipUnselected]}>
                <Text style={[s.chipText, sel ? s.chipTextSelected : s.chipTextUnselected]}>{group}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.label}>Exercises</Text>
        {exercises.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} onUpdate={updateExercise} />
        ))}

        <Pressable onPress={addExercise} style={s.addExerciseButton}>
          <Text style={s.addExerciseText}>+ Add Exercise</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.saveButton, pressed && s.saveButtonPressed, !canSave && s.saveButtonDisabled]}
          onPress={() => canSave && saveMutation.mutate()}
          disabled={!canSave}
        >
          <Text style={[s.saveButtonText, !canSave && s.saveButtonTextDisabled]}>
            {saveMutation.isPending ? 'Saving...' : 'Save Routine'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backChevron: { color: colors.primary, fontSize: 32, lineHeight: 32, fontWeight: '400' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fontFamilies.displayBold, fontSize: 20, lineHeight: 26, color: colors.primary },
  headerRight: { width: 32 },
  content: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, lineHeight: 20, color: colors.text, letterSpacing: 0.05, textTransform: 'uppercase' },
  nameInput: { height: 48, backgroundColor: colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, fontFamily: fontFamilies.body, fontSize: 16, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { height: 36, borderRadius: radius.full, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipUnselected: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13, lineHeight: 16 },
  chipTextSelected: { color: colors.base, fontWeight: '700' },
  chipTextUnselected: { color: colors.textSecondary },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.sm, gap: spacing.sm },
  exerciseName: { flex: 1, fontFamily: fontFamilies.bodyMedium, fontSize: 14, color: colors.text },
  exerciseInputs: { flexDirection: 'row', gap: spacing.sm },
  inputGroup: { alignItems: 'center', gap: 2 },
  inputLabel: { fontFamily: fontFamilies.bodyMedium, fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' },
  smallInput: { width: 48, height: 36, backgroundColor: colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, textAlign: 'center', fontFamily: fontFamilies.bodyMedium, fontSize: 14, color: colors.text },
  addExerciseButton: { alignItems: 'center', paddingVertical: spacing.sm },
  addExerciseText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, color: colors.primary },
  saveButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.full, height: 48, marginTop: spacing.sm },
  saveButtonPressed: { backgroundColor: colors.primaryPressed },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 16, color: colors.base, fontWeight: '700' },
  saveButtonTextDisabled: { opacity: 0.7 },
});
