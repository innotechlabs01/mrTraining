import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ArrowLeftIcon, BellIcon, SearchIcon, FireIcon } from '../../../../shared/components/icons';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { StatGrid } from '../../../../shared/components/ui/StatGrid';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.nutritionScreen;

type MealType = 'desayuno' | 'almuerzo' | 'cena';
type Meal = { id: string; title: string; type: MealType; calories: number; time: string };

type NutritionData = {
  macros?: { protein: number; carbs: number; fat: number; calories: number };
  meals?: Meal[];
};

type MealFilterKey = 'all' | MealType;

const FILTERS: { key: MealFilterKey; label: string }[] = [
  { key: 'all', label: t.filterAll },
  { key: 'desayuno', label: t.filterBreakfast },
  { key: 'almuerzo', label: t.filterLunch },
  { key: 'cena', label: t.filterDinner },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Nutrition'>;

type MealCardProps = {
  item: Meal;
  onPress: (meal: Meal) => void;
};

const MealCard = React.memo(function MealCard({ item, onPress }: MealCardProps) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardIcon}>
        <FireIcon size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          {item.calories} kcal · {item.time}
        </Text>
      </View>
      <Text style={styles.cardType}>{item.type}</Text>
    </Pressable>
  );
});

function keyExtractor(item: Meal): string {
  return item.id;
}

export function NutritionScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<MealFilterKey>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['athlete-nutrition'],
    queryFn: async () => {
      const { data: today } = await apiClient.get('/athlete/today');
      const nutrition = today?.nutrition as NutritionData | undefined;
      return nutrition ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });

  const meals = useMemo(() => {
    const list = data?.meals ?? [];
    if (filter === 'all') return list;
    return list.filter((m) => m.type === filter);
  }, [data, filter]);

  const macros = data?.macros;

  const openMeal = useCallback(
    (meal: Meal) =>
      navigation.navigate('MealDetail', { name: meal.title, calories: meal.calories, time: meal.time }),
    [navigation],
  );

  const renderMeal = useCallback(
    ({ item }: { item: Meal }) => <MealCard item={item} onPress={openMeal} />,
    [openMeal],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.common.back}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        <View style={styles.headerRight}>
          <Pressable accessibilityLabel={texts.common.search} onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
            <SearchIcon size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel={texts.common.notifications} onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
            <BellIcon size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <SegmentedFilter
        options={FILTERS}
        value={filter}
        onChange={(k) => setFilter(k as MealFilterKey)}
      />

      {isLoading ? (
        <View style={[styles.content, styles.loading]}>
          <Skeleton.Block height={112} radius={16} />
          <Skeleton.List rows={3} height={72} />
        </View>
      ) : (
        <FlashList
          data={meals}
          renderItem={renderMeal}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <StatGrid
              metrics={[
                { label: t.calories, value: macros?.calories != null ? String(macros.calories) : null, unit: 'kcal' },
                { label: t.protein, value: macros?.protein != null ? String(macros.protein) : null, unit: 'g' },
                { label: t.fats, value: macros?.fat != null ? String(macros.fat) : null, unit: 'g' },
                { label: t.carbs, value: macros?.carbs != null ? String(macros.carbs) : null, unit: 'g' },
              ]}
              cols={2}
              emptyPlaceholder={null}
            />
          }
          ListEmptyComponent={
            isError ? (
              <EmptyState
                variant="error"
                title={t.errorTitle}
                message={t.errorMessage}
                onRetry={() => refetch()}
              />
            ) : (
              <EmptyState
                variant="empty"
                title={t.emptyTitle}
                message={t.emptyMessage}
              />
            )
          }
        />
      )}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.md },
  loading: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 48,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  cardType: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
});
