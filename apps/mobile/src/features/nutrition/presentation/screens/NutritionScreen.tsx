import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ArrowLeftIcon, BellIcon, SearchIcon, UserIcon, FireIcon } from '../../../../shared/components/icons';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { StatGrid } from '../../../../shared/components/ui/StatGrid';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';

type MealType = 'desayuno' | 'almuerzo' | 'cena';
type Meal = { id: string; title: string; type: MealType; calories: number; time: string };

type NutritionData = {
  macros?: { protein: number; carbs: number; fat: number; calories: number };
  meals?: Meal[];
};

type MealFilterKey = 'all' | MealType;

const FILTERS: { key: MealFilterKey; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'almuerzo', label: 'Almuerzo' },
  { key: 'cena', label: 'Cena' },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Nutrition'>;

export function NutritionScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<MealFilterKey>('all');

  const { data, isLoading } = useQuery({
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
        <Text style={styles.headerTitle}>Nutrición</Text>
        <View style={styles.headerRight}>
          <Pressable accessibilityLabel="Buscar" onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
            <SearchIcon size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Notificaciones" onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
            <BellIcon size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Perfil" onPress={() => undefined} style={styles.iconButton}>
            <UserIcon size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <SegmentedFilter
        options={FILTERS}
        value={filter}
        onChange={(k) => setFilter(k as MealFilterKey)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loading}>
            <Skeleton.Block height={112} radius={16} />
            <Skeleton.List rows={3} height={72} />
          </View>
        ) : (
          <>
            <StatGrid
              metrics={[
                { label: 'Calorías', value: macros?.calories != null ? String(macros.calories) : null, unit: 'kcal' },
                { label: 'Proteínas', value: macros?.protein != null ? String(macros.protein) : null, unit: 'g' },
                { label: 'Grasas', value: macros?.fat != null ? String(macros.fat) : null, unit: 'g' },
                { label: 'Carbohidratos', value: macros?.carbs != null ? String(macros.carbs) : null, unit: 'g' },
              ]}
              cols={2}
              emptyPlaceholder={null}
            />

            {meals.length === 0 ? (
              <EmptyState
                variant="empty"
                title="Sin registro de comidas hoy"
                message="Tus comidas aparecerán acá cuando las registres."
              />
            ) : (
              meals.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('MealDetail', { name: item.title, calories: item.calories, time: item.time })
                  }
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
              ))
            )}
          </>
        )}
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
