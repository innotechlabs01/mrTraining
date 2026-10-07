import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { colors, layout, spacing, typography } from '../../theme/tokens';
import { ArrowLeftIcon } from '../icons';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  loading?: boolean;
  /** Optional big numeral shown on the right for KPI headers. */
  metric?: React.ReactNode;
  /** root: in-flow header with optional back. sub: pushed-screen header with safe-area + auto goBack. */
  variant?: 'root' | 'sub';
};

/** Pushed-screen layout — isolated so useNavigation only runs for the sub variant. */
function SubScreenHeaderView({ title }: { title: string }) {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView edges={['top']} style={styles.subSafe}>
      <View style={styles.subHeaderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.subBackButton}
        >
          <ArrowLeftIcon size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.subHeaderTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subHeaderSpacer} />
      </View>
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle, onBack, action, loading = false, metric, variant = 'root' }: Props) {
  if (variant === 'sub') {
    return <SubScreenHeaderView title={title} />;
  }

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
  // sub variant styles (pushed screens, primary-tinted title)
  subSafe: { backgroundColor: colors.base },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  subBackButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  subHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.h3,
    color: colors.primary,
  },
  subHeaderSpacer: { width: 32 },
});
