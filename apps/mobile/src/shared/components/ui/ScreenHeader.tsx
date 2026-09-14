import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, spacing, typography } from '../../theme/tokens';
import { ArrowLeftIcon } from '../icons';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  loading?: boolean;
  /** Optional big numeral shown on the right for KPI headers. */
  metric?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, action, loading = false, metric }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={onBack}
          accessibilityHint="Volver a la pantalla anterior"
          disabled={loading}
          style={({ pressed }) => [styles.backPressable, pressed && styles.pressed]}
        >
          <ArrowLeftIcon size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {metric ?? action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: layout.headerHeight,
    gap: spacing.sm,
  },
  titles: { flex: 1 },
  backPressable: {
    width: layout.touchTarget + 8,
    height: layout.touchTarget + 8,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
