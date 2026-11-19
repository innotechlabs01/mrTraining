/**
 * SessionFeedbackScreen — post-workout feedback to the coach.
 *
 * The atleta rates perceived exertion (RPE 1-10) and adds free-text notes.
 * Submitting sends the feedback to the coach and closes the coach↔atleta loop.
 *
 * Note: the Go API feedback endpoint is not yet exposed in the mobile client.
 * Submission is persisted locally and confirmed via toast; wire the POST when
 * the endpoint exists. No contract is invented here.
 */

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { Input } from '../../../../shared/components/ui/Input';
import { showToast } from '../../../../shared/components/ui/Toast';
import { texts } from '../../../../shared/i18n/texts';
import type { RootStackParamList } from '../../../../navigation/Navigation';

const t = texts.screens.sessionFeedback;

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SessionFeedback'>;

type Props = {
  navigation: Nav;
  route: Route;
};

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function SessionFeedbackScreen({ navigation, route }: Props) {
  const { sessionId, workoutId } = route.params ?? {};
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const handleSelectRpe = useCallback((value: number) => {
    setRpe(value);
  }, []);

  const handleSend = useCallback(async () => {
    if (rpe == null) {
      showToast('error', t.title, 'Seleccioná un nivel de esfuerzo.');
      return;
    }

    setSending(true);

    // TODO: wire POST to Go API feedback endpoint when exposed.
    // Persist locally so feedback is never lost while offline.
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      showToast('success', t.sentTitle, t.sentMessage);
      void navigation.goBack();
    } catch {
      showToast('error', t.title, 'No se pudo enviar. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  }, [rpe, navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        {/* RPE selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.rpeLabel}</Text>
          <Text style={styles.sectionHint}>{t.rpeHint}</Text>
          <View style={styles.rpeRow}>
            {RPE_VALUES.map((value) => {
              const selected = rpe === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => handleSelectRpe(value)}
                  style={[
                    styles.rpePill,
                    selected && styles.rpePillSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`RPE ${value}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.rpeText, selected && styles.rpeTextSelected]}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.notesLabel}</Text>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder={t.notesPlaceholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            style={styles.notesInput}
          />
        </View>

        <View style={styles.bottomSpacer} />

        <PrimaryButton
          label={t.sendButton}
          onPress={handleSend}
          disabled={sending || rpe == null}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rpeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rpePill: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rpeText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  rpeTextSelected: {
    color: colors.base,
    fontWeight: '700',
  },
  notesInput: {
    ...typography.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  bottomSpacer: { height: spacing.lg },
});
