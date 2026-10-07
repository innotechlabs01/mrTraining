import React, { useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { FireIcon, UserIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.coachChallengesScreen;

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Challenge = {
  id: string;
  title: string;
  description?: string;
  exercise_type: string;
  status: string;
  athlete_id?: string;
  created_at: string;
};

async function fetchCoachChallenges(): Promise<Challenge[]> {
  const { data } = await apiClient.get('/challenges');
  return (data as any)?.data ?? [];
}

function keyExtractor(item: Challenge): string {
  return item.id;
}

export function CoachChallengesScreen() {
  const navigation = useNavigation<Nav>();

  const { data: challenges, isLoading, isError, refetch } = useQuery({
    queryKey: ['coach-challenges'],
    queryFn: fetchCoachChallenges,
    staleTime: 30_000,
  });

  const renderChallenge = useCallback(({ item }: { item: Challenge }) => (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.exerciseBadge}>
          <FireIcon size={12} color={colors.primary} />
          <Text style={styles.exerciseText}>{item.exercise_type}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'active' && styles.statusActive]}>
          <Text style={[styles.statusText, item.status === 'active' && styles.statusTextActive]}>
            {item.status === 'active' ? texts.challenge.active : item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.challengeTitle}>{item.title}</Text>
      {item.description ? (
        <Text style={styles.challengeDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.challengeFooter}>
        <View style={styles.footerItem}>
          <UserIcon size={14} color={colors.textSecondary} />
          <Text style={styles.footerText}>
            {item.athlete_id ? t.assigned : t.open}
          </Text>
        </View>
        <Text style={styles.footerDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonLineShort} />
            </View>
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          variant="error"
          title={t.errorTitle}
          message={t.errorMessage}
          onRetry={() => refetch()}
        />
      ) : challenges?.length === 0 ? (
        <EmptyState
          variant="empty"
          title={t.emptyTitle}
          message={t.emptyMessage}
        />
      ) : (
        <FlashList
          data={challenges}
          renderItem={renderChallenge}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.ctaWrap}>
        <PrimaryButton
          label={t.create}
          onPress={() => {
            navigation.navigate('CreateChallenge');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  loadingWrap: { padding: spacing.md, gap: spacing.md },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    width: '60%',
  },
  skeletonLineShort: {
    height: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    width: '40%',
  },
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  exerciseText: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  statusText: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statusTextActive: {
    color: colors.success,
  },
  challengeTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  challengeDescription: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerDate: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  ctaWrap: { padding: spacing.md, paddingTop: 0 },
});
