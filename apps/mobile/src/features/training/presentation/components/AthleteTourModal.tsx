import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {
  CalendarIcon,
  PlayIcon,
  ChatIcon,
  CloseIcon,
  CheckIcon,
} from '../../../../shared/components/icons';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';

export interface AthleteTourModalProps {
  visible: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  detail: string;
  icon: (color: string) => React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Tu Plan de Entrenamiento',
    subtitle: 'Diseñado por tu Coach',
    detail: 'Encuentra cada día tus sesiones programadas de fuerza, running y recuperación adaptadas a tu nivel.',
    icon: (c) => <CalendarIcon size={36} color={c} />,
  },
  {
    title: '2. Ejecución y Métricas en Vivo',
    subtitle: 'Registra tu esfuerzo',
    detail: 'Usa el cronómetro interactivo, anota tus pesos, RPE y activa el tracking GPS para tus salidas de carrera.',
    icon: (c) => <PlayIcon size={36} color={c} />,
  },
  {
    title: '3. Conexión y Progreso',
    subtitle: 'Feedback continuo',
    detail: 'Monitorea tus marcas personales (PRs), analiza tu consistencia semanal y mantén contacto directo con tu entrenador.',
    icon: (c) => <ChatIcon size={36} color={c} />,
  },
];

export function AthleteTourModal({ visible, onClose }: AthleteTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { width } = useWindowDimensions();

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (isLast) {
      setCurrentStep(0);
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { maxWidth: Math.min(width - 32, 400) }]}>
          {/* Close button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar tour"
            onPress={handleClose}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <CloseIcon size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Icon Circle */}
          <View style={styles.iconContainer}>
            {step.icon(colors.primary)}
          </View>

          {/* Text Content */}
          <Text style={styles.stepCounter}>Paso {currentStep + 1} de {TOUR_STEPS.length}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>
          <Text style={styles.detail}>{step.detail}</Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {TOUR_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStep ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Action button */}
          <View style={styles.actionRow}>
            <PrimaryButton
              label={isLast ? '¡Comenzar a entrenar!' : 'Siguiente paso →'}
              onPress={handleNext}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    zIndex: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  stepCounter: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  detail: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.border,
  },
  actionRow: {
    width: '100%',
  },
});
