import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { getClerkToken } from '../../../../infrastructure/auth/clerk';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { TrophyIcon } from '../../../../shared/components/icons';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

type LeaderboardRoute = RouteProp<RootStackParamList, 'Leaderboard'>;

type LeaderboardEntry = {
  rank: number;
  athlete_id: string;
  athlete_name: string;
  best_score: number;
  attempts: number;
  score: number;
  trend: string;
};

function getPositionColor(rank: number): string {
  if (rank === 1) return colors.primary;
  if (rank === 2) return colors.text;
  if (rank === 3) return colors.textSecondary;
  return colors.textSecondary;
}

function getPositionIcon(rank: number) {
  if (rank <= 3) {
    return <TrophyIcon size={16} color={getPositionColor(rank)} />;
  }
  return <Text style={styles.positionText}>{rank}</Text>;
}

const LeaderboardRow = React.memo(function LeaderboardRow({ item }: { item: LeaderboardEntry }) {
  return (
    <View style={styles.entry}>
      <View style={styles.position}>
        {getPositionIcon(item.rank)}
      </View>
      <View style={styles.athleteInfo}>
        <Text style={styles.athleteName} numberOfLines={1}>
          {item.athlete_name}
        </Text>
        <Text style={styles.attemptsText}>
          {item.attempts} {texts.challenge.attempts.toLowerCase()}
        </Text>
      </View>
      <View style={styles.scoreInfo}>
        <Text style={styles.bestScore}>{item.best_score.toFixed(1)}</Text>
        <Text style={styles.scoreLabel}>{texts.challenge.formScore.toLowerCase()}</Text>
      </View>
    </View>
  );
});

function keyExtractor(item: LeaderboardEntry): string {
  return `${item.athlete_id}-${item.rank}`;
}

function renderItem({ item }: { item: LeaderboardEntry }) {
  return <LeaderboardRow item={item} />;
}

export function LeaderboardScreen() {
  const route = useRoute<LeaderboardRoute>();
  const { challengeId } = route.params;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', challengeId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/challenges/${challengeId}/leaderboard`);
      return data?.data as LeaderboardEntry[];
    },
    staleTime: 30_000,
  });

  // Live-update the leaderboard via WebSocket.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;

    const base = Constants.expoConfig?.extra?.goApiUrl ?? 'http://localhost:8080';
    const wsBase = base.replace(/^http/, 'ws');

    getClerkToken().then((token) => {
      if (closed || !token) return;
      ws = new WebSocket(`${wsBase}/challenges/${challengeId}/leaderboard/ws?token=${encodeURIComponent(token)}`);

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'challenge.leaderboard.updated') {
            queryClient.setQueryData<LeaderboardEntry[]>(['leaderboard', challengeId], msg.payload ?? []);
          }
        } catch {
          /* ignore */
        }
      };
    });

    return () => {
      closed = true;
      ws?.close();
    };
  }, [challengeId, queryClient]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={texts.challenge.leaderboard} />

      {isLoading ? (
        <View style={styles.center}>
          <Skeleton.List rows={8} height={64} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState
            variant="error"
            title={texts.state.errorTitle}
            message={texts.state.errorMessage}
          />
        </View>
      ) : !data || data.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            variant="empty"
            title={texts.challenge.noAttempts}
            message={texts.challenge.noAttempts}
          />
        </View>
      ) : (
        <FlashList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  position: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  athleteInfo: {
    flex: 1,
  },
  athleteName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  attemptsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scoreInfo: {
    alignItems: 'flex-end',
  },
  bestScore: {
    ...typography.metricSM,
    color: colors.primary,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
