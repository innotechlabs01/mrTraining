/**
 * ExercisesScreen — athlete exercise library.
 *
 * Catalog of exercises assigned by the coach. Training-first: the atleta can
 * browse, search, favorite and open the demo video of any exercise outside a
 * live session.
 *
 * - FlashList for 60 FPS scroll at any length.
 * - Search filters client-side (debounced via state, no extra dependency).
 * - Favorites toggle with optimistic local state + server sync.
 * - Play button opens the exercise demo video (Linking).
 *
 * API contract: GET /exercises → ListResponse<Exercise[]> (Go API, single
 * source of truth). No new contract.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { asList } from '../../../../infrastructure/api/envelope';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  type Favorite,
} from '../../../favorites/favoriteService';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { DumbbellIcon, PlayIcon, StarIcon } from '../../../../shared/components/icons';
import { Input } from '../../../../shared/components/ui/Input';
import { texts } from '../../../../shared/i18n/texts';

type Exercise = {
  id: string;
  name: string;
  category?: string;
  muscleGroup?: string;
  videoUrl?: string;
};

type Props = {};

export function ExercisesScreen({}: Props) {
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises-catalog'],
    queryFn: async (): Promise<Exercise[]> => {
      const { data } = await apiClient.get('/exercises');
      return asList<Exercise>(data);
    },
    staleTime: 300_000,
  });

  const { data: favoritesData = [] } = useQuery({
    queryKey: ['exercises-favorites'],
    queryFn: listFavorites,
    staleTime: 30_000,
  });

  // Hydrate local favorite set from server favorites (workout type = exercise).
  const exerciseFavoriteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of favoritesData as Favorite[]) {
      if (f.type === 'workout') {
        ids.add((f as { itemId?: string }).itemId ?? f.id);
      }
    }
    return ids;
  }, [favoritesData]);

  useMemo(() => {
    setFavoriteIds(exerciseFavoriteIds);
  }, [exerciseFavoriteIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.muscleGroup?.toLowerCase().includes(q),
    );
  }, [exercises, query]);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (exercise: Exercise) => {
      const currently = isFavorite(exercise.id);
      // Optimistic local update.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currently) next.delete(exercise.id);
        else next.add(exercise.id);
        return next;
      });

      try {
        if (currently) {
          // Find the server favorite id to remove.
          const fav = (favoritesData as Favorite[]).find(
            (f) =>
              f.type === 'workout' &&
              ((f as { itemId?: string }).itemId ?? f.id) === exercise.id,
          );
          if (fav?.id) await removeFavorite(fav.id);
        } else {
          await addFavorite({
            type: 'workout',
            title: exercise.name,
            description: exercise.category ?? '',
          });
        }
      } catch {
        // Revert on failure.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (currently) next.add(exercise.id);
          else next.delete(exercise.id);
          return next;
        });
      }
    },
    [isFavorite, favoritesData],
  );

  const openVideo = useCallback((url: string | undefined) => {
    if (!url) return;
    void Linking.openURL(url).catch(() => {
      // Video not openable — silent fail, exercise still usable.
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => {
      const fav = isFavorite(item.id);
      const hasVideo = Boolean(item.videoUrl);
      return (
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <DumbbellIcon size={20} color={colors.textSecondary} />
          </View>
          <View style={[styles.body, { flex: 1 }]}>
            <Text style={styles.title} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.subtitle}>
              {(item.category ?? '')} {item.muscleGroup ? ` · ${item.muscleGroup}` : ''}
            </Text>
          </View>
          <View style={styles.actions}>
            {hasVideo ? (
              <Pressable
                style={styles.actionBtn}
                onPress={() => openVideo(item.videoUrl)}
                accessibilityLabel={`Ver demo de ${item.name}`}
              >
                <PlayIcon size={18} color={colors.primary} />
              </Pressable>
            ) : null}
            <Pressable
              style={[
                styles.actionBtn,
                fav && styles.actionBtnActive,
              ]}
              onPress={() => toggleFavorite(item)}
              accessibilityLabel={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              accessibilityRole="button"
            >
              <StarIcon size={18} color={fav ? colors.primary : colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      );
    },
    [isFavorite, toggleFavorite, openVideo],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={texts.screens.exercises.exercisesTitle}
        variant="sub"
      />

      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={texts.screens.exercises.searchPlaceholder}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonWrap} />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="empty"
          title={texts.screens.exercises.emptyTitle}
          message={texts.screens.exercises.emptyMessage}
        />
      ) : (
        <FlashList<Exercise>
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.flashContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  searchWrap: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    height: 48,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  skeletonWrap: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
  },
  flashContent: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.touchTarget,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 15,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: `${colors.primary}14`,
  },
});
