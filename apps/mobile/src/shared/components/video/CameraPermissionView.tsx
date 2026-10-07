import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../../theme/tokens'
import { texts } from '../../i18n/texts'

const tc = texts.formCamera

type Props = {
  variant: 'permission' | 'noDevice'
  onRequestPermissions: () => void
  onCancel: () => void
}

export function CameraPermissionView({ variant, onRequestPermissions, onCancel }: Props) {
  if (variant === 'noDevice') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>{tc.cameraUnavailable}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>{texts.common.cancel}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.permissionContainer}>
      <Ionicons name="videocam-off" size={48} color={colors.textSecondary} />
      <Text style={styles.permissionText}>
        {tc.permissionBody}
      </Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={onRequestPermissions}
      >
        <Text style={styles.permissionButtonText}>{tc.grantPermissions}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>{texts.common.cancel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: spacing.xl,
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  permissionButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
})
