import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Alert, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import type { RootStackParamList } from '../../../../navigation/Navigation';

export function CreateChallengeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseType, setExerciseType] = useState('squat');
  const [targetSets, setTargetSets] = useState('3');
  const [targetReps, setTargetReps] = useState('10');
  const [durationMinutes, setDurationMinutes] = useState('15');

  const exerciseTypes = [
    { value: 'squat', label: 'Sentadilla' },
    { value: 'deadlift', label: 'Peso muerto' },
    { value: 'bench', label: 'Press banca' },
    { value: 'overhead', label: 'Press militar' },
    { value: 'pullup', label: 'Dominada' },
    { value: 'row', label: 'Remo' },
    { value: 'lunge', label: 'Zancada' },
    { value: 'plank', label: 'Plancha' },
  ];

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/challenges', {
        title,
        description,
        exercise_type: exerciseType,
        target_sets: parseInt(targetSets) || 3,
        target_reps: parseInt(targetReps) || 10,
        duration_minutes: parseInt(durationMinutes) || 15,
      });
      return data;
    },
    onSuccess: () => {
      Alert.alert('¡Desafío creado!', 'El desafío está listo para tus atletas.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      queryClient.invalidateQueries({ queryKey: ['coach-challenges'] });
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo crear el desafío.');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Crear Desafío" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Sentadilla perfecta"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe el desafío..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Exercise Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Tipo de ejercicio *</Text>
          <View style={styles.chipGroup}>
            {exerciseTypes.map((ex) => (
              <TouchableOpacity
                key={ex.value}
                style={[styles.chip, exerciseType === ex.value && styles.chipActive]}
                onPress={() => setExerciseType(ex.value)}
              >
                <Text style={[styles.chipText, exerciseType === ex.value && styles.chipTextActive]}>
                  {ex.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Sets & Reps */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Series objetivo</Text>
            <TextInput
              style={styles.input}
              value={targetSets}
              onChangeText={setTargetSets}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Reps objetivo</Text>
            <TextInput
              style={styles.input}
              value={targetReps}
              onChangeText={setTargetReps}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Duration */}
        <View style={styles.field}>
          <Text style={styles.label}>Duración (minutos)</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            keyboardType="numeric"
            placeholder="15"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Note about video */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🎥 Video demo</Text>
          <Text style={styles.infoText}>
            Después de crear el desafío, podrás grabar o subir un video demostrando el ejercicio correcto.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <PrimaryButton
          label="Crear desafío"
          onPress={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!title || !exerciseType}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  field: { gap: spacing.xs },
  halfField: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  label: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoTitle: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  infoText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  ctaWrap: { padding: spacing.md, paddingTop: 0 },
});
