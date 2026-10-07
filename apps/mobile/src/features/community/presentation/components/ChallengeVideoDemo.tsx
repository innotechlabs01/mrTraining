import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../../../shared/theme/tokens';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { PlayIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

type Props = {
  videoUrl: string;
};

/** Coach demo video section with an external-link CTA. */
export function ChallengeVideoDemo({ videoUrl }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeader title={texts.screens.challengeVideoDemo.title} icon={<PlayIcon size={18} color={colors.primary} />} />
      <View style={styles.card}>
        <PrimaryButton
          label={texts.screens.challengeVideoDemo.label}
          variant="outline"
          onPress={() => {
            const url = videoUrl;
            if (!url) return;
            Linking.openURL(url).catch(() =>
              Alert.alert(texts.screens.challengeVideoDemo.errorTitle, texts.screens.challengeVideoDemo.openFailed),
            );
          }}
        />
      </View>
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
});
