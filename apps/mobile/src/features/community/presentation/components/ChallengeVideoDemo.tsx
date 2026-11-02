import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { PlayIcon, LockIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';
import { ExerciseDemoModal } from '../../../../features/training/presentation/components/execution/ExerciseDemoModal';
import { isPlayableVideoUrl } from '../../../../shared/components/video/isPlayableVideoUrl';

type Props = {
  videoUrl: string;
  /** Optional challenge ID for tracking; falls back to videoUrl. */
  challengeId?: string;
  /** Optional challenge title for the modal header. */
  challengeTitle?: string;
};

/** Coach demo video section — opens in-app modal if playable, shows disabled state if not. */
export function ChallengeVideoDemo({ videoUrl, challengeId, challengeTitle }: Props) {
  const [demoVisible, setDemoVisible] = useState(false);
  const playable = isPlayableVideoUrl(videoUrl);

  return (
    <View style={styles.section}>
      <SectionHeader
        title={texts.screens.challengeVideoDemo.title}
        icon={playable ? <PlayIcon size={18} color={colors.primary} /> : <LockIcon size={18} color={colors.textSecondary} />}
      />
      {playable ? (
        <>
          <View style={styles.card}>
            <PrimaryButton
              label={texts.screens.challengeVideoDemo.label}
              variant="outline"
              onPress={() => setDemoVisible(true)}
            />
          </View>
          {demoVisible && (
            <ExerciseDemoModal
              videoUrl={videoUrl}
              exerciseId={challengeId ?? `challenge-${videoUrl}`}
              exerciseName={challengeTitle ?? texts.screens.challengeVideoDemo.title}
              showAiCta={false}
              onClose={() => setDemoVisible(false)}
            />
          )}
        </>
      ) : (
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={styles.disabledContent}>
            <LockIcon size={24} color={colors.textSecondary} />
            <Text style={styles.disabledText}>{texts.screens.challengeVideoDemo.noVideo}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  cardDisabled: {
    opacity: 0.6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  disabledContent: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  disabledText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
