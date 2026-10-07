import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Badge } from '../../../../shared/components/ui/Badge';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import type { Registration } from './eventDetailTypes';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventResponseCta;

type Props = {
  status: Registration['status'] | undefined;
  pending: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

/** Event response CTA: accept button, or confirmed badge plus cancel action. */
export function EventResponseCta({ status, pending, onAccept, onCancel }: Props) {
  return (
    <View style={styles.cta}>
      {status === 'accepted' ? (
        <View style={styles.ctaStack}>
          <Badge text={t.confirmed} tone="success" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.cancelAttendance}
            disabled={pending}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
              pending && styles.secondaryBtnDisabled,
            ]}
          >
            <Text style={styles.secondaryBtnText}>{t.cancelAttendance}</Text>
          </Pressable>
        </View>
      ) : (
        <PrimaryButton
          label={status === 'cancelled' ? t.acceptAgain : t.accept}
          onPress={onAccept}
          disabled={pending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cta: { marginTop: spacing.md },
  ctaStack: { gap: spacing.sm },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.lg,
  },
  secondaryBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { ...typography.bodyStrong, color: colors.text },
});
