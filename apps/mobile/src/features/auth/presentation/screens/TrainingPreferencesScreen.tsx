/**
 * TrainingPreferencesScreen — edit modality (instant save) and weekly
 * schedule (days + time). Single screen, one primary action per section.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { SubScreenHeader } from '../../../../shared/components/ui/SubScreenHeader';
import { ChatIcon, CheckIcon, StarIcon, MapPinIcon } from '../../../../shared/components/icons';
import {
  DAY_ABBR,
  DAY_FULL,
  DAY_KEYS,
  MODALITY_META,
  normalizeModality,
  profileScheduleRaw,
  scheduleDayKeys,
  useAthleteProfile,
  type AthleteModality,
} from '../../application/useAthleteProfile';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.trainingPreferences;

const MODALITY_ICONS: Record<AthleteModality, React.ReactElement> = {
  virtual: <ChatIcon size={18} color={colors.primary} />,
  hibrido: <StarIcon size={18} color={colors.primary} />,
  presencial: <MapPinIcon size={18} color={colors.primary} />,
};

export function TrainingPreferencesScreen() {
  const queryClient = useQueryClient();
  const { data: profile } = useAthleteProfile();

  const [modality, setModality] = useState<AthleteModality>('virtual');
  const [modalitySaving, setModalitySaving] = useState<AthleteModality | null>(null);
  const [scheduleDays, setScheduleDays] = useState<Set<string>>(new Set());
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setModality(normalizeModality(profile.modality ?? profile.service_type ?? profile.serviceType));
    const { days } = profileScheduleRaw(profile);
    setScheduleDays(new Set(scheduleDayKeys(days)));
    setScheduleTime(profileScheduleRaw(profile).time);
  }, [profile]);

  const handleModalitySelect = async (next: AthleteModality) => {
    if (next === modality) return;
    const prev = modality;
    setModality(next);
    setModalitySaving(next);
    try {
      await apiClient.put('/athlete/profile', { modality: next });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
    } catch (err: unknown) {
      setModality(prev);
      const msg = err instanceof Error ? err.message : t.modalityUpdateFailed;
      Alert.alert(t.errorTitle, msg);
    } finally {
      setModalitySaving(null);
    }
  };

  const toggleDay = (day: string) => {
    setScheduleDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    try {
      await apiClient.put('/athlete/profile', {
        scheduleDays: Array.from(scheduleDays).join(','),
        scheduleTime,
      });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      Alert.alert(t.savedTitle, t.scheduleSaved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.updateFailed;
      Alert.alert(t.errorTitle, msg);
    } finally {
      setScheduleSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SubScreenHeader title={t.headerTitle} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t.modalityTitle}</Text>
          <Text style={styles.cardSubtitle}>{t.modalitySubtitle}</Text>

          <View style={styles.segmentedRow}>
            {MODALITY_META.map((opt) => {
              const selected = modality === opt.key;
              const isSaving = modalitySaving === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.pill,
                    selected ? styles.pillSelected : styles.pillUnselected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleModalitySelect(opt.key)}
                  disabled={!!modalitySaving}
                  accessibilityLabel={`${t.modalityA11yPrefix} ${opt.label}`}
                  accessibilityState={{ selected }}
                >
                  <View style={styles.pillIconView}>{MODALITY_ICONS[opt.key]}</View>
                  <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                    {opt.label}
                  </Text>
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={selected ? colors.base : colors.primary}
                      style={styles.pillLoader}
                    />
                  ) : selected ? (
                    <CheckIcon size={14} color={selected ? colors.base : colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t.scheduleTitle}</Text>
          <Text style={styles.cardSubtitle}>{t.scheduleSubtitle}</Text>

          <View style={styles.dayRow}>
            {DAY_KEYS.map((day) => {
              const selected = scheduleDays.has(day);
              return (
                <Pressable
                  key={day}
                  style={({ pressed }) => [
                    styles.dayChip,
                    selected ? styles.dayChipSelected : styles.dayChipUnselected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggleDay(day)}
                  accessibilityLabel={DAY_FULL[day]}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                    {DAY_ABBR[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>{t.timeLabel}</Text>
          <Input
            placeholder="08:00"
            value={scheduleTime}
            onChangeText={setScheduleTime}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            accessibilityLabel={t.timeLabel}
          />

          <PrimaryButton label={t.saveSchedule} onPress={handleSaveSchedule} disabled={scheduleSaving} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  card: { padding: spacing.lg },
  cardTitle: { ...typography.title, color: colors.text },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  segmentedRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  pill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 72,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillUnselected: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  pillIconView: { marginBottom: 2 },
  pillText: { ...typography.caption, fontWeight: '700', textAlign: 'center' },
  pillTextSelected: { color: colors.base },
  pillTextUnselected: { color: colors.text },
  pillLoader: { marginTop: 2 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.md },
  dayChip: {
    flexBasis: '30%',
    flexGrow: 1,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipUnselected: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  dayChipText: { ...typography.caption, fontWeight: '700', color: colors.text },
  dayChipTextSelected: { color: colors.base },
});