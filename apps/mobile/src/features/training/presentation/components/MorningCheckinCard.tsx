/**
 * MorningCheckinCard — 10-second subjective readiness check-in.
 * One check-in per day (server upserts), shown on Today before the summary.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';

type Checkin = {
  id: string;
  date: string;
  readiness: number;
};

const OPTIONS = [
  { value: 1, label: 'Agotado' },
  { value: 2, label: 'Bajo' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Óptimo' },
];

export function MorningCheckinCard() {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/athlete/checkin/today');
      const value = (data as { data?: Checkin | null } | Checkin | null) ?? null;
      setCheckin(
        value && typeof value === 'object' && 'readiness' in value
          ? (value as Checkin)
          : ((value as { data?: Checkin | null })?.data ?? null)
      );
    } catch {
      // no check-in is a valid state; keep card actionable
      setCheckin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (readiness: number) => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/athlete/checkin', { readiness });
      const saved = ((data as { data?: Checkin })?.data ?? data) as Checkin;
      setCheckin(saved);
      setEditing(false);
    } catch {
      setError('No se pudo guardar el check-in. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  const done = Boolean(checkin) && !editing;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Check-in de hoy</Text>
      {done && checkin ? (
        <View style={styles.row}>
          <Text style={styles.doneText}>
            Readiness {checkin.readiness}/5 · {OPTIONS.find((o) => o.value === checkin.readiness)?.label ?? ''}
          </Text>
          <Pressable onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.link}>Cambiar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>¿Cómo te sentís para entrenar hoy?</Text>
          <View style={styles.options}>
            {OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                style={[styles.option, saving && styles.disabled]}
                disabled={saving}
                onPress={() => void submit(o.value)}
              >
                <Text style={styles.optionValue}>{o.value}</Text>
                <Text style={styles.optionLabel}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  title: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneText: { color: colors.text, fontSize: 13 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  options: { flexDirection: 'row', gap: spacing.xs },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  optionValue: { color: colors.text, fontWeight: '700', fontSize: 16 },
  optionLabel: { color: colors.textSecondary, fontSize: 9, marginTop: 2 },
  disabled: { opacity: 0.5 },
  error: { color: colors.error, fontSize: 11, marginTop: spacing.xs },
});
