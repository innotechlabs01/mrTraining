import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ArrowLeftIcon, ClockIcon, FireIcon } from '../../../../shared/components/icons';
import { MetricCard } from '../../../../shared/components/ui/MetricCard';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealDetail'>;
type MealDetailRoute = RouteProp<RootStackParamList, 'MealDetail'>;

export function MealDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<MealDetailRoute>();
  const { name = 'Comida', calories, time } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MetricCard label="Calorías" value={calories != null ? String(calories) : null} unit="kcal" size="lg" />

        <View style={styles.metaRow}>
          {time != null ? (
            <View style={styles.metaItem}>
              <ClockIcon size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{time}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <FireIcon size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{name}</Text>
          </View>
        </View>

        <EmptyState
          variant="empty"
          title="Sin desglose disponible"
          message="Los macros, ingredientes y pasos de preparación se mostrarán cuando estén disponibles para esta comida."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.primary,
  },
  headerSpacer: { width: 32 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.bodySmall, color: colors.textSecondary },
});
