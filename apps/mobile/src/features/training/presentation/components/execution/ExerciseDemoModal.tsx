/**
 * ExerciseDemoModal — full-screen on-demand demo video during workout execution.
 *
 * Wraps ExerciseVideoPlayer (metrics-tracked) in a dark overlay. Dumb component:
 * visibility, AI flag, and navigation are owned by the parent screen.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../../../../../shared/theme/tokens';
import { texts } from '../../../../../shared/i18n/texts';
import { CloseIcon } from '../../../../../shared/components/icons';
import { ExerciseVideoPlayer } from '../../../../../shared/components/video/ExerciseVideoPlayer';
import { isPlayableVideoUrl } from '../../../../../shared/components/video/isPlayableVideoUrl';

type Props = {
  videoUrl: string;
  exerciseId: string;
  exerciseName: string;
  /** Show the "record with AI" action inside the player controls. */
  showAiCta: boolean;
  onClose: () => void;
  onRecordPress?: () => void;
};

export function ExerciseDemoModal({
  videoUrl,
  exerciseId,
  exerciseName,
  showAiCta,
  onClose,
  onRecordPress,
}: Props) {
  const recordProps = showAiCta && onRecordPress ? { onRecordPress } : {};
  if (!isPlayableVideoUrl(videoUrl)) return null;
  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.common.close}
          onPress={onClose}
          style={styles.close}
          hitSlop={8}
        >
          <CloseIcon size={24} color={colors.text} />
        </Pressable>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{exerciseName}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={texts.common.close}
              onPress={onClose}
              style={styles.close}
              hitSlop={8}
            >
              <CloseIcon size={24} color={colors.text} />
            </Pressable>
          </View>
          <ExerciseVideoPlayer
            videoUrl={videoUrl}
            videoId={exerciseId}
            videoType="demo"
            title={exerciseName}
            {...recordProps}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.base,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
