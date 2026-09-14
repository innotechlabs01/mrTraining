import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { welcomeImage } from '../../../../shared/theme/onboardingImages';
import { ChevronRightIcon } from '../../../../shared/components/icons';

type Props = {
  onNewUser: () => void;
  onExistingUser: () => void;
};

export function WelcomeScreen({ onNewUser, onExistingUser }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Fitness hero background */}
      <Image source={{ uri: welcomeImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {/* Dark overlay for contrast */}
      <View style={styles.overlay} pointerEvents="none" />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>MR</Text>
          </View>
          <Text style={styles.title}>Ve más allá{'\n'}de tus límites</Text>
          <Text style={styles.subtitle}>
            Tu entrenador personal en el bolsillo. Entrena mejor, recupérate mejor y alcanza tus metas.
          </Text>
        </View>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={onNewUser}
            accessibilityRole="button"
            accessibilityLabel="Soy nuevo aquí — Obtener un plan personalizado"
          >
            <View style={styles.cardIcon}>
              <Text style={styles.cardMonogram}>MR</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Soy nuevo aquí</Text>
              <Text style={styles.cardDesc}>Obtén un plan personalizado según tu deporte y objetivos</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.primary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={onExistingUser}
            accessibilityRole="button"
            accessibilityLabel="Ya entreno — Iniciar sesión para continuar"
          >
            <View style={styles.cardIcon}>
              <Text style={styles.cardMonogram}>+</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Ya entreno</Text>
              <Text style={styles.cardDesc}>Inicia sesión y continúa donde lo dejaste</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={styles.hint}>
          ¿Tienes un código de entrenador? Ingresalo durante el registro.
        </Text>

        <Text style={styles.footer}>
          Al continuar aceptas nuestros Términos de Servicio y Política de Privacidad.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,15,14,0.55)',
  },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing.xl },
  header: { alignItems: 'center', marginTop: spacing.xl },
  iconCircle: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`, borderWidth: 2, borderColor: `${colors.primary}40`,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  iconText: { fontFamily: fontFamilies.displayBlack, fontSize: 22, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.h1, fontSize: 32, lineHeight: 40, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, fontSize: 16, lineHeight: 24, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.md },
  cards: { gap: spacing.sm, marginTop: spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${colors.surface}E6`, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  cardIcon: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: `${colors.primary}18`, justifyContent: 'center', alignItems: 'center',
  },
  cardMonogram: { fontFamily: fontFamilies.displayBold, fontSize: 16, color: colors.primary },
  cardContent: { flex: 1 },
  cardTitle: { ...typography.title, fontSize: 17, color: colors.text, marginBottom: spacing.xs },
  cardDesc: { ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  hint: { ...typography.caption, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  footer: { ...typography.caption, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
});
