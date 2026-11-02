import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, layout, spacing, typography } from '../../../../shared/theme/tokens';
import { ClockIcon, FireIcon } from '../../../../shared/components/icons';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { MetricCard } from '../../../../shared/components/ui/MetricCard';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.mealDetail;

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealDetail'>;
type MealDetailRoute = RouteProp<RootStackParamList, 'MealDetail'>;

export function MealDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<MealDetailRoute>();
  const { name = t.headerTitle, calories, time } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <ScreenHeader title={name} onBack={() => navigation.goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MetricCard label={t.calories} value={calories != null ? String(calories) : null} unit="kcal" size="lg" />

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
          title={t.emptyBreakdown}
          message={t.emptyBreakdownBody}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  headerWrap: { paddingHorizontal: layout.pagePadding },
  content: { padding: layout.pagePadding, paddingBottom: spacing.xxl, gap: spacing.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.bodySmall, color: colors.textSecondary },
});
