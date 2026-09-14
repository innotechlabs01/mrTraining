import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listFavorites, Favorite } from '@features/favorites/favoriteService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ArrowLeftIcon, BellIcon, PlayIcon, SearchIcon, StarIcon, UserIcon } from '../../../../shared/components/icons';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

type FavoriteType = 'all' | 'video' | 'article';

const FILTERS: { key: FavoriteType; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'video', label: 'Video' },
  { key: 'article', label: 'Artículo' },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FavoritesScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<FavoriteType>('all');

  const { data: favoritesData, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: listFavorites,
    staleTime: 300_000,
  });

  const filtered = useMemo(() => {
    const list = favoritesData ?? [];
    if (filter === 'all') return list;
    return list.filter((item) => item.type === filter);
  }, [filter, favoritesData]);

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
        <Text style={styles.headerTitle}>Favoritos</Text>
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

      <SegmentedFilter options={FILTERS} value={filter} onChange={(k) => setFilter(k as FavoriteType)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Skeleton.List rows={4} height={72} />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="empty"
            title="Sin favoritos"
            message="Marca contenido con la estrella para verlo aquí."
          />
        ) : (
          filtered.map((item, idx) => (
            <ListCard
              key={item.id}
              title={item.title}
              subtitle={itemDescription(item)}
              leadingIcon={<StarIcon size={20} color={colors.textSecondary} />}
              trailing={isPlayable(item) ? <PlayIcon size={18} color={colors.primary} /> : undefined}
              last={idx === filtered.length - 1}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function isPlayable(item: Favorite): boolean {
  return item.type === 'workout' || item.type === 'video';
}

function itemDescription(item: Favorite): string | undefined {
  const parts = [item.duration, item.calories ? `${item.calories} kcal` : undefined, item.exercises].filter(
    Boolean,
  ) as string[];
  return parts.length ? parts.join(' · ') : item.description;
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
});
