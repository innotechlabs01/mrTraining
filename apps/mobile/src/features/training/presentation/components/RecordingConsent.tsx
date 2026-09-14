/**
 * RecordingConsent — Asks athlete for consent before recording form metrics.
 *
 * Shows clear explanation of what data is collected and how it helps them improve.
 * Must be accepted before any recording begins.
 *
 * Stored in AsyncStorage so it only asks once per device.
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens'

const CONSENT_KEY = '@mr/form_recording_consent'

type ConsentState = 'pending' | 'accepted' | 'denied'

interface RecordingConsentProps {
  onConsent: (accepted: boolean) => void
}

/**
 * Check if user has already given consent
 */
export async function hasRecordingConsent(): Promise<ConsentState> {
  try {
    const value = await AsyncStorage.getItem(CONSENT_KEY)
    if (value === 'accepted') return 'accepted'
    if (value === 'denied') return 'denied'
    return 'pending'
  } catch {
    return 'pending'
  }
}

/**
 * Save consent decision
 */
async function saveConsent(decision: ConsentState): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, decision)
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
    await saveConsent('accepted')
    setVisible(false)
    onConsent(true)
  }

  const handleDeny = async () => {
    await saveConsent('denied')
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
          <Text style={styles.title}>Mejora tu rendimiento</Text>

          {/* Friendly description */}
          <Text style={styles.description}>
            Analizamos tu forma en cada ejercicio para ayudarte a mejorar. Tu coach verá tus métricas y te dará feedback personalizado.
          </Text>

          {/* Benefits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Cómo te ayuda?</Text>
            <View style={styles.listItem}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
              <Text style={styles.listText}>Detecta qué ejercicios necesitan atención</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="bar-chart" size={16} color={colors.success} />
              <Text style={styles.listText}>Muestra tu progreso semana a semana</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="chatbubble-ellipses" size={16} color={colors.success} />
              <Text style={styles.listText}>Tu coach te da feedback específico</Text>
            </View>
          </View>

          {/* What we collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qué recopilamos</Text>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.listText}>Puntuación de forma (0-100)</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.listText}>Profundidad, alineación y tempo</Text>
            </View>
          </View>

          {/* What we DON'T collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu privacidad</Text>
            <View style={styles.listItem}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.listText}>No grabamos video — solo números</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.listText}>Solo tu coach puede ver tus métricas</Text>
            </View>
          </View>

          {/* Privacy note */}
          <Text style={styles.privacy}>
            Puedes desactivar esto en cualquier momento desde Configuración.
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity onPress={handleDeny} style={styles.denyButton}>
              <Text style={styles.denyText}>Ahora no</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAccept} style={styles.acceptButton}>
              <Text style={styles.acceptText}>Activar</Text>
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
