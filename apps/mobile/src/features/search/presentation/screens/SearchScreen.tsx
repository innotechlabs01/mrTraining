import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { listFavorites } from '../../../favorites/favoriteService';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { SearchIcon, BarbellIcon, TargetIcon, StarIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type SearchFilter = 'all' | 'entrenamientos' | 'nutricion';

type SearchItem = {
  id: string;
  type: 'workout' | 'exercise';
  title: string;
  meta1: string;
  meta2: string;
  favorite?: boolean;
};

const FILTERS: SearchFilter[] = ['all', 'entrenamientos', 'nutricion'];
const FILTER_LABELS = { all: 'Todo', entrenamientos: 'Entrenamientos', nutricion: 'Nutrición' };
const FILTER_KEYS: SearchFilter[] = ['all', 'entrenamientos', 'nutricion'];

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [query, setQuery] = useState('');

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['athlete-workouts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/workouts');
      return (data?.data ?? data) as Array<{ id: string; contentName: string; modality: string; status: string }>;
    },
    staleTime: 60_000,
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await apiClient.get('/exercises');
      return data as Array<{ id: string; name: string; category?: string; muscleGroup?: string }>;
    },
    staleTime: 300_000,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: listFavorites,
    staleTime: 30_000,
  });

  const isLoading = workoutsLoading || exercisesLoading;

  const allItems: SearchItem[] = useMemo(() => {
    const workoutItems: SearchItem[] = (workouts ?? []).map((w) => ({
      id: `w-${w.id}`,
      type: 'workout' as const,
      title: w.contentName,
      meta1: w.modality ?? '',
      meta2: w.status ?? '',
    }));
    const exerciseItems: SearchItem[] = (exercises ?? []).map((e) => ({
      id: `e-${e.id}`,
      type: 'exercise' as const,
      title: e.name,
      meta1: e.category ?? '',
      meta2: e.muscleGroup ?? '',
    }));
    const favoriteIds = new Set((favoritesData ?? []).map((f: any) => f.itemId ?? f.id));
    const favoriteItems: SearchItem[] = (favoritesData ?? []).map((f: any) => ({
      id: `fav-${f.id}`,
      type: 'exercise' as const,
      title: f.itemTitle ?? f.title ?? '',
      meta1: f.itemMeta ?? f.description ?? '',
      meta2: 'Favorito',
      favorite: true,
    }));
    exerciseItems.forEach((e) => {
      if (favoriteIds.has(e.id.replace('e-', ''))) e.favorite = true;
    });
    return [...favoriteItems, ...workoutItems, ...exerciseItems];
  }, [workouts, exercises, favoritesData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'entrenamientos' && item.type === 'workout') ||
        (filter === 'nutricion' && item.type === 'exercise');
      const matchesQuery = q.length === 0 || item.title.toLowerCase().includes(q) || item.meta1.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [allItems, filter, query]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Buscar" onBack={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <SearchIcon size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.filterWrap}>
        <SegmentedFilter
          options={FILTER_KEYS.map((k) => ({ key: k, label: FILTER_LABELS[k] }))}
          value={filter}
          onChange={(key) => setFilter(key as SearchFilter)}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton.List rows={5} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="empty"
          title="Sin resultados"
          message="Intenta con otra búsqueda o filtro."
          actionLabel={query ? 'Limpiar búsqueda' : undefined}
          onAction={
            query
              ? () => {
                  setQuery('');
                  setFilter('all');
                }
              : undefined
          }
        />
      ) : (
        <View style={styles.listContent}>
          {filtered.map((item) => (
            <ListCard
              key={item.id}
              title={item.title}
              subtitle={item.meta2 ? `${item.meta1} · ${item.meta2}` : item.meta1}
              leadingIcon={
                <View>
                  {item.type === 'workout' ? (
                    <BarbellIcon size={20} color={colors.textSecondary} />
                  ) : (
                    <TargetIcon size={20} color={colors.textSecondary} />
                  )}
                </View>
              }
              trailing={
                item.favorite ? <StarIcon size={18} color={colors.primary} /> : undefined
              }
              onPress={() => undefined}
            />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  searchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 15,
  },
  filterWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  skeletonWrap: { paddingHorizontal: spacing.md },
  listContent: { flex: 1, paddingHorizontal: spacing.md, gap: spacing.sm },
});
