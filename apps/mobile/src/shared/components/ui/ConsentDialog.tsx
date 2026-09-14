import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Alert } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme/tokens';
import { PrimaryButton } from './PrimaryButton';
import { texts } from '../../i18n/texts';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
};

export function ConsentDialog({ visible, onAccept, onDecline, loading }: Props) {
  const handleAccept = () => {
    Alert.alert(
      'Confirmar consentimiento',
      'Al aceptar, permites que tus videos de entrenamiento sean grabados y almacenados para revision del coach.',
      [
        { text: texts.common.cancel, style: 'cancel' },
        { text: texts.common.confirm, onPress: onAccept },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Continuar sin video',
      'Podras participar registrando metricas manualmente, pero no podras subir videos.',
      [
        { text: texts.common.cancel, style: 'cancel' },
        { text: texts.common.confirm, onPress: onDecline },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{texts.challenge.consentTitle}</Text>
          <Text style={styles.body}>{texts.challenge.consentBody}</Text>

          <View style={styles.actions}>
            <PrimaryButton
              label={texts.challenge.consentAccept}
              onPress={handleAccept}
              variant="primary"
              disabled={loading}
            />
            <PrimaryButton
              label={texts.challenge.consentDecline}
              onPress={handleDecline}
              variant="outline"
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  actions: {
    gap: spacing.sm,
  },
});
