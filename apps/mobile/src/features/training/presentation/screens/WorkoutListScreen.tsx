import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, typography, fontFamilies } from '../../../../shared/theme/tokens';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { texts } from '../../../../shared/i18n/texts';
import { WorkoutCard, type WorkoutItem } from '../components/WorkoutCard';
import { CreateWorkoutCard } from '../components/CreateWorkoutCard';
import { WorkoutListHeader } from '../components/WorkoutListHeader';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Level = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

const LEVELS: Level[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

type Nav = NativeStackNavigationProp<RootStackParamList>;

const tw = texts.screens.workoutList;

function keyExtractor(item: WorkoutItem): string {
  return item.id;
}

export function WorkoutListScreen() {
  const navigation = useNavigation<Nav>();
  const [level, setLevel] = useState<Level>('All');

  const { data: workouts, isLoading, isError, refetch } = useQuery({
    queryKey: ['athlete-workouts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/workouts');
      // Go returns ListResponse {data: [...]} — unwrap
      return (data?.data ?? data) as WorkoutItem[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!workouts) return [];
    if (level === 'All') return workouts;
    return workouts.filter((w) => w.modality?.toLowerCase() === level.toLowerCase());
  }, [workouts, level]);

  const openWorkout = useCallback(
    (workoutId: string) => navigation.navigate('WorkoutDetail', { workoutId }),
    [navigation],
  );

  const openCreateRoutine = useCallback(
    () => navigation.navigate('CreateRoutine'),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: WorkoutItem }) => <WorkoutCard item={item} onPress={openWorkout} />,
    [openWorkout],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <WorkoutListHeader
        onBack={() => navigation.goBack()}
        onSearch={() => navigation.navigate('Search')}
        onNotifications={() => navigation.navigate('Notifications')}
      />

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {LEVELS.map((l) => {
          const selected = level === l;
          return (
            <Pressable
              key={l}
              onPress={() => setLevel(l)}
              style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                {l}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Workout list */}
      {isLoading ? (
        <View style={styles.listContent}>
          <CreateWorkoutCard onPress={openCreateRoutine} />
          <Skeleton.List rows={4} height={84} />
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<CreateWorkoutCard onPress={openCreateRoutine} />}
          ListEmptyComponent={
            isError ? (
              <EmptyState
                variant="error"
                title={tw.loadErrorTitle}
                message={tw.loadErrorMessage}
                onRetry={() => refetch()}
              />
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No workouts assigned yet</Text>
                <Text style={styles.emptySub}>Your coach will assign workouts soon.</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pill: {
    height: 36,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillUnselected: { backgroundColor: colors.surface, borderColor: colors.border },
  pillText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13, lineHeight: 16 },
  pillTextSelected: { color: colors.base, fontWeight: '700' },
  pillTextUnselected: { color: colors.textSecondary },
  listContent: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: 4 },
  emptyText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, color: colors.text },
  emptySub: { ...typography.caption, color: colors.textSecondary },
});
