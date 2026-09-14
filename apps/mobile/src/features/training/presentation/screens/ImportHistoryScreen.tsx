import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { importData } from '../../../import/importService';
import { Card } from '../../../../shared/components/ui/Card';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { CheckIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportHistory'>;

type ImportResult = {
  sessionsImported: number;
  setsImported: number;
  exercisesCreated?: string[];
};

/**
 * One-time history import (Strong / Hevy / FitNotes CSV). The athlete pastes the export
 * contents; unmatched exercise names become custom exercises so nothing is dropped.
 */
export function ImportHistoryScreen({ navigation }: Props) {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      const athleteID = 'current'; // replace with real auth context
      const source = 'csv';
      return importData(athleteID, source, csv);
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      console.error('Failed to import workouts:', err);
      Alert.alert('Import failed', 'Check that the CSV is a valid Strong/Hevy/FitNotes export and try again.');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Importar historial" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>Traé tu historial</Text>
          <Text style={styles.introBody}>
            Exportá tus entrenamientos desde Strong, Hevy o FitNotes como CSV y pegá acá el
            contenido. Ejercicios desconocidos se crean automáticamente.
          </Text>
        </Card>

        {result ? (
          <Card style={styles.resultCard}>
            <View style={styles.resultTitleRow}>
              <CheckIcon size={20} color={colors.success} />
              <Text style={styles.resultTitle}>Importación lista</Text>
            </View>
            <Text style={styles.resultLine}>{result.sessionsImported} sesiones importadas</Text>
            <Text style={styles.resultLine}>{result.setsImported} series registradas</Text>
            {result.exercisesCreated && result.exercisesCreated.length > 0 ? (
              <Text style={styles.resultLine}>
                Ejercicios creados: {result.exercisesCreated.join(', ')}
              </Text>
            ) : null}
            <PrimaryButton label="Listo" onPress={() => navigation.goBack()} />
          </Card>
        ) : (
          <>
            <View style={styles.csvBoxWrap}>
              <Text style={styles.csvLabel}>CONTENIDO DEL CSV</Text>
              <RNTextInput
                value={csv}
                onChangeText={setCsv}
                style={styles.csvInput}
                multiline
                placeholder="Date,Workout Name,Exercise Name,Set Order,Weight,Reps…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <PrimaryButton
              label={importMutation.isPending ? 'Importando…' : 'Importar'}
              onPress={() => importMutation.mutate()}
              disabled={importMutation.isPending || csv.trim().length === 0}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 },

  introCard: { gap: spacing.xs },
  introTitle: { ...typography.bodyStrong, color: colors.text },
  introBody: { ...typography.caption, color: colors.textSecondary },

  csvBoxWrap: { gap: spacing.xs },
  csvLabel: { ...typography.label, color: colors.textSecondary },
  csvInput: {
    minHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: colors.text,
    padding: spacing.md,
    textAlignVertical: 'top',
    ...typography.caption,
  },

  resultCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultTitle: { ...typography.title, color: colors.text },
  resultLine: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
