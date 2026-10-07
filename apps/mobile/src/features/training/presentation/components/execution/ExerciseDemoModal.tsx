/**
 * ExerciseDemoModal — full-screen on-demand demo video during workout execution.
 *
 * Wraps ExerciseVideoPlayer (metrics-tracked) in a dark overlay. Dumb component:
 * visibility, AI flag, and navigation are owned by the parent screen.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../../../shared/theme/tokens';
import { texts } from '../../../../../shared/i18n/texts';
import { CloseIcon } from '../../../../../shared/components/icons';
import { ExerciseVideoPlayer } from '../../../../../shared/components/video/ExerciseVideoPlayer';

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
        <View>
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  close: {
    alignSelf: 'flex-end',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
});
