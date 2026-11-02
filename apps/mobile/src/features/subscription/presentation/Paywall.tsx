/**
 * Paywall — premium upsell screen shown when the athlete's subscription is
 * inactive or expired.
 *
 * Follows brand guidelines: dark theme, single MR Blue (#15AAF2) accent, one
 * primary CTA per screen, WCAG AA contrast, touch targets ≥ 44pt.
 *
 * Voice: bold, direct, verb-first copy — no exclamation points, no "journey",
 * no emoji in product copy.
 */

import { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  SafeAreaView,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useColorScheme } from 'react-native';
import {
  LockIcon,
  CheckIcon,
  ChevronRightIcon,
} from '../../../shared/components/icons';
import { PrimaryButton } from '../../../shared/components/ui/PrimaryButton';
import {
  colors,
  spacing,
  layout,
  typography,
  radius,
} from '../../../shared/theme/tokens';
import { texts } from '../../../shared/i18n/texts';
import type { PremiumFeature } from '../domain/subscription';

const PAYWALL_ICON_SIZE = 48;

type Props = {
  /** Optional callback when the user completes a purchase. */
  onPurchaseComplete?: () => void;
};

/** Premium features displayed on the paywall. */
const PAYWALL_FEATURES: PremiumFeature[] = [
  {
    id: 'advanced_metrics',
    title: 'Métricas avanzadas',
    description:
      'HRV, readiness score, carga aguda vs. crónica y tendencias de rendimiento para entrenar con precisión.',
  },
  {
    id: 'specialized_workout_plans',
    title: 'Planes de entrenamiento especializados',
    description:
      'Programas diseñados por tu coach para tu deporte, nivel y objetivos, con progresión semanal.',
  },
  {
    id: 'direct_messaging',
    title: 'Mensajería directa con tu coach',
    description:
      'Comunícate en tiempo real con tu entrenador para resolver dudas y ajustar tu plan.',
  },
];

export function Paywall({ onPurchaseComplete }: Props = {}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';

  const handleSubscribePress = useCallback(() => {
    void onPurchaseComplete?.();
  }, [onPurchaseComplete]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.base : '#FFFFFF' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <LockIcon size={PAYWALL_ICON_SIZE} color={colors.primary} />
          </View>
          <Text style={styles.eyebrow}>
            {texts.screens.membershipScreen.statusNone}
          </Text>
          <Text
            style={[
              styles.title,
              { color: isDark ? colors.text : '#0B0F0E' },
            ]}
          >
            Acceso premium bloqueado
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? colors.textSecondary : '#4B5563' },
            ]}
          >
            Desbloquea métricas avanzadas, planes de entrenamiento
            especializados y mensajería directa con tu coach.
          </Text>
        </View>

        {/* Features list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lo que incluí́s con Premium</Text>
          <View style={styles.featuresList}>
            {PAYWALL_FEATURES.map((feature) => (
              <View
                key={feature.id}
                style={[
                  styles.featureRow,
                  {
                    backgroundColor: isDark ? colors.surface : '#F5F5F7',
                  },
                ]}
              >
                <View style={styles.checkWrap}>
                  <CheckIcon size={20} color={colors.success} />
                </View>
                <View style={styles.featureBody}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? colors.text : '#0B0F0E' },
                    ]}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    style={[
                      styles.featureDescription,
                      { color: isDark ? colors.textSecondary : '#4B5563' },
                    ]}
                  >
                    {feature.description}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <ChevronRightIcon size={16} color={colors.textSecondary} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Plan / CTA */}
        <View style={styles.ctaSection}>
          <Text
            style={[
              styles.planTitle,
              { color: isDark ? colors.text : '#0B0F0E' },
            ]}
          >
            Plan Premium
          </Text>
          <Text style={styles.planPrice}>$49.000 / mes</Text>
          <Text
            style={[
              styles.planSubtitle,
              { color: isDark ? colors.textSecondary : '#4B5563' },
            ]}
          >
            Cancelá cuando quieras. Sin permanencia.
          </Text>
          <PrimaryButton
            label="Ver planes y suscribirme"
            onPress={handleSubscribePress}
            size="lg"
            fullWidth
          />
        </View>

        {/* Secondary actions */}
        <View
          style={[
            styles.secondaryActions,
            {
              borderTopColor: isDark ? colors.border : '#E5E7EB',
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {}}
            hitSlop={layout.touchTarget / 2}
            style={styles.secondaryBtn}
          >
            <Text
              style={[
                styles.secondaryText,
                { color: isDark ? colors.primary : '#15AAF2' },
              ]}
            >
              Restaurar compra
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: isDark ? colors.border : '#E5E7EB' }]} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {}}
            hitSlop={layout.touchTarget / 2}
            style={styles.secondaryBtn}
          >
            <Text
              style={[
                styles.secondaryText,
                { color: isDark ? colors.primary : '#15AAF2' },
              ]}
            >
              Ayuda y soporte
            </Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  } as ViewStyle,
  iconWrap: {
    width: PAYWALL_ICON_SIZE,
    height: PAYWALL_ICON_SIZE,
    borderRadius: PAYWALL_ICON_SIZE / 2,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  } as TextStyle,
  title: {
    ...typography.h2,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  } as TextStyle,
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  } as TextStyle,
  section: {
    gap: spacing.md,
  } as ViewStyle,
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
  } as TextStyle,
  featuresList: {
    gap: spacing.md,
  } as ViewStyle,
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: layout.touchTarget,
  } as ViewStyle,
  checkWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.success}15`,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  featureBody: {
    flex: 1,
  } as ViewStyle,
  featureTitle: {
    ...typography.bodyStrong,
    marginBottom: 2,
  } as TextStyle,
  featureDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  } as TextStyle,
  chevronWrap: {
    padding: spacing.xs,
  } as ViewStyle,
  ctaSection: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  } as ViewStyle,
  planTitle: {
    ...typography.h3,
    fontWeight: '800',
  } as TextStyle,
  planPrice: {
    ...typography.metricLG,
    color: colors.primary,
  } as TextStyle,
  planSubtitle: {
    ...typography.caption,
    textAlign: 'center',
  } as TextStyle,
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    minHeight: layout.touchTarget + 16,
  } as ViewStyle,
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  } as ViewStyle,
  secondaryText: {
    ...typography.bodySmall,
  } as TextStyle,
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
  } as ViewStyle,
});
