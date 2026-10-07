/**
 * RecordingConsent — Asks athlete for consent before recording form metrics.
 *
 * Shows clear explanation of what data is collected and how it helps them improve.
 * Must be accepted before any recording begins.
 *
 * Consent state lives in MMKV (user-scoped) via FormMetricsStorage — the single
 * source of truth for the consent key.
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens'
import { texts } from '../../../../shared/i18n/texts'

const t = texts.screens.recordingConsent
import {
  getConsentState,
  setConsentState,
  type ConsentState,
} from '../../../../infrastructure/storage/FormMetricsStorage'

interface RecordingConsentProps {
  onConsent: (accepted: boolean) => void
}

/**
 * Check if user has already given consent
 */
export async function hasRecordingConsent(): Promise<ConsentState> {
  return getConsentState()
}

export function RecordingConsent({ onConsent }: RecordingConsentProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    hasRecordingConsent().then((state) => {
      if (state === 'pending') {
        setVisible(true)
      }
    })
  }, [])

  const handleAccept = async () => {
    await setConsentState('accepted')
    setVisible(false)
    onConsent(true)
  }

  const handleDeny = async () => {
    await setConsentState('denied')
    setVisible(false)
    onConsent(false)
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="analytics" size={32} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t.title}</Text>

          {/* Friendly description */}
          <Text style={styles.description}>
            {t.description}
          </Text>

          {/* Benefits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.benefitsTitle}</Text>
            <View style={styles.listItem}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
              <Text style={styles.listText}>{t.benefit1}</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="bar-chart" size={16} color={colors.success} />
              <Text style={styles.listText}>{t.benefit2}</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="chatbubble-ellipses" size={16} color={colors.success} />
              <Text style={styles.listText}>{t.benefit3}</Text>
            </View>
          </View>

          {/* What we collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.collectTitle}</Text>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.listText}>{t.collect1}</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.listText}>{t.collect2}</Text>
            </View>
          </View>

          {/* What we DON'T collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.privacyTitle}</Text>
            <View style={styles.listItem}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.listText}>{t.privacy1}</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.listText}>{t.privacy2}</Text>
            </View>
          </View>

          {/* Privacy note */}
          <Text style={styles.privacy}>
            {t.privacyNote}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity onPress={handleDeny} style={styles.denyButton}>
              <Text style={styles.denyText}>{t.denyButton}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAccept} style={styles.acceptButton}>
              <Text style={styles.acceptText}>{t.acceptButton}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  privacy: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  denyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  denyText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  acceptText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
})
