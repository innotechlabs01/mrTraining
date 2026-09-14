import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, typography, fontFamilies } from '../../../../shared/theme/tokens';
import {
  SearchIcon,
  BellIcon,
  UserIcon,
  ArrowLeftIcon,
  StarIcon,
  DumbbellIcon,
  RunningIcon,
  HeartPulseIcon,
  YogaIcon,
  FireIcon,
  type IconProps,
} from '../../../../shared/components/icons';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Level = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

type WorkoutItem = {
  id: string;
  contentName: string;
  modality: string;
  status: string;
  progress: number;
  startDate: string;
};

const LEVELS: Level[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const MODALITY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  strength: DumbbellIcon,
  flexibility: YogaIcon,
  cardio: RunningIcon,
  conditioning: FireIcon,
  recovery: HeartPulseIcon,
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WorkoutListScreen() {
  const navigation = useNavigation<Nav>();
  const [level, setLevel] = useState<Level>('All');

  const { data: workouts, isLoading } = useQuery({
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Workout</Text>
        <View style={styles.headerRight}>
          <Pressable accessibilityLabel="Search" onPress={() => undefined} style={styles.iconButton}>
            <SearchIcon size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Notifications" onPress={() => undefined} style={styles.iconButton}>
            <BellIcon size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Profile" onPress={() => undefined} style={styles.iconButton}>
            <UserIcon size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

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
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Your Own */}
        <Pressable
          onPress={() => navigation.navigate('CreateRoutine')}
          style={({ pressed }) => [styles.createCard, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.createIcon}>{'+'}</Text>
          <View style={styles.createLeft}>
            <Text style={styles.createTitle}>Create Your Own</Text>
            <Text style={styles.createSub}>Build a custom routine from scratch</Text>
          </View>
        </Pressable>

        {isLoading ? (
          <Skeleton.List rows={4} height={84} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No workouts assigned yet</Text>
            <Text style={styles.emptySub}>Your coach will assign workouts soon.</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const ModalityIcon = MODALITY_ICONS[item.modality?.toLowerCase()] ?? DumbbellIcon;
            const progressPct = Math.round((item.progress ?? 0) * 100);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.contentName}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{item.modality}</Text>
                    <Text style={styles.metaDot}>{'\u00B7'}</Text>
                    <Text style={styles.metaText}>{item.status}</Text>
                    {progressPct > 0 && (
                      <>
                        <Text style={styles.metaDot}>{'\u00B7'}</Text>
                        <Text style={styles.metaText}>{progressPct}%</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.imageWrap}>
                  <ModalityIcon size={28} color={colors.textSecondary} />
                  <View style={styles.starBadge}>
                    <StarIcon size={10} color={colors.primary} />
                  </View>
                </View>
              </View>
            );
          })
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
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: { color: colors.primary, fontSize: 32, lineHeight: 32, fontWeight: '400' },
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
  iconButtonText: { fontSize: 14 },
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
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: spacing.md,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    textAlign: 'center',
    lineHeight: 44,
    fontSize: 22,
    fontWeight: '700',
    color: colors.base,
    overflow: 'hidden',
  },
  createLeft: { flex: 1, gap: 2 },
  createTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14 },
  createSub: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 84,
  },
  cardLeft: { flex: 1, padding: spacing.md, gap: 6 },
  cardTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontFamily: fontFamilies.bodyMedium, fontSize: 11, color: colors.textSecondary },
  metaDot: { fontSize: 11, color: colors.textSecondary },
  imageWrap: {
    width: 90,
    height: 90,
    margin: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  imageEmoji: { fontSize: 28 },
  starBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { color: colors.primary, fontSize: 10, lineHeight: 12 },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: 4 },
  emptyText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, color: colors.text },
  emptySub: { ...typography.caption, color: colors.textSecondary },
});
