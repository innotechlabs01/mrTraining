import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, typography, shadows } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { StatGrid } from '../../../../shared/components/ui/StatGrid';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { CountdownTimer } from '../../../../shared/components/ui/CountdownTimer';
import { ConsentDialog } from '../../../../shared/components/ui/ConsentDialog';
import { FireIcon, PlayIcon, CheckIcon, TrophyIcon, TrendUpIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ChallengeDetailRoute = RouteProp<RootStackParamList, 'ChallengeDetail'>;

type ChallengeData = {
  id: string;
  title: string;
  description: string;
  exercise_type: string;
  video_url?: string;
  end_date: string;
  scoring_type: string;
  status: string;
  coach_id: string;
  difficulty_level?: string;
  max_attempts: number;
  target_sets?: number;
  target_reps?: number;
};

type ChallengeAttempt = {
  id: string;
  attempt_number: number;
  form_score?: number;
  depth_score?: number;
  alignment_score?: number;
  tempo_score?: number;
  sets_completed: number;
  reps_completed: number;
  total_volume?: number;
  status: string;
  created_at: string;
  completed_at?: string;
};

type LeaderboardEntry = {
  rank: number;
  athlete_id: string;
  athlete_name: string;
  best_score: number;
  attempts: number;
};

type ChallengeResponse = {
  challenge: ChallengeData;
  attempts: ChallengeAttempt[];
  stats: {
    total_attempts: number;
    unique_athletes: number;
    avg_form_score: number;
    best_form_score: number;
  };
  leaderboard: LeaderboardEntry[];
};

async function fetchChallenge(challengeId: string): Promise<ChallengeResponse> {
  const { data } = await apiClient.get(`/challenges/${challengeId}`);
  return (data as any)?.data ?? data;
}

async function joinChallenge(challengeId: string, videoConsent: boolean, photoConsent: boolean): Promise<any> {
  const { data } = await apiClient.post(`/athlete/challenges/${challengeId}/join`, {
    video_consent: videoConsent,
    photo_consent: photoConsent,
  });
  return (data as any)?.data ?? data;
}

function getDaysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getScoreTypeLabel(scoringType: string): string {
  switch (scoringType) {
    case 'form_score': return texts.challenge.formScore;
    case 'total_volume': return texts.challenge.totalVolume;
    case 'consistency': return texts.challenge.consistency;
    default: return scoringType;
  }
}

export function ChallengeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ChallengeDetailRoute>();
  const { challengeId } = route.params;
  const queryClient = useQueryClient();
  const [showConsent, setShowConsent] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: () => fetchChallenge(challengeId),
    staleTime: 60_000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ videoConsent, photoConsent }: { videoConsent: boolean; photoConsent: boolean }) =>
      joinChallenge(challengeId, videoConsent, photoConsent),
    onSuccess: (res: any) => {
      const attemptId = res?.id ?? null;
      if (attemptId) setCurrentAttemptId(attemptId);
      Alert.alert('Exito', 'Te has unido al desafio. Ahora puedes registrar tu intento.');
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo unir al desafio.');
    },
  });

  const challenge = response?.challenge;
  const attempts = response?.attempts ?? [];
  const stats = response?.stats;
  const leaderboard = response?.leaderboard ?? [];

  const myAttempts = attempts.filter(a => a.status === 'completed');
  const lastAttempt = myAttempts[0];
  const daysLeft = challenge ? getDaysRemaining(challenge.end_date) : 0;
  const isExpired = daysLeft <= 0;
  const canAttempt = challenge ? myAttempts.length < challenge.max_attempts : false;

  const handleJoin = () => {
    setShowConsent(true);
  };

  const handleConsentAccept = () => {
    setShowConsent(false);
    joinMutation.mutate({ videoConsent: true, photoConsent: true });
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
    joinMutation.mutate({ videoConsent: false, photoConsent: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={texts.challenge.activeChallenge} onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <StatGrid
            loading
            metrics={[
              { label: texts.challenge.attempts, value: null },
              { label: texts.challenge.formScore, value: null },
            ]}
          />
        </View>
      ) : isError ? (
        <EmptyState
          variant="error"
          title={texts.state.errorTitle}
          message={texts.state.errorMessage}
          onRetry={() => refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Countdown */}
          {challenge && (
            <View style={styles.countdownCard}>
              <CountdownTimer endDate={challenge.end_date} size="lg" />
            </View>
          )}

          {/* Challenge Header */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>{challenge?.title ?? texts.challenge.activeChallenge}</Text>
            {challenge?.description ? (
              <Text style={styles.description}>{challenge.description}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <View style={styles.exerciseBadge}>
                <FireIcon size={14} color={colors.primary} />
                <Text style={styles.exerciseText}>{challenge?.exercise_type}</Text>
              </View>
              {challenge?.scoring_type && (
                <View style={styles.scoreBadge}>
                  <TrendUpIcon size={14} color={colors.secondary} />
                  <Text style={styles.scoreBadgeText}>{getScoreTypeLabel(challenge.scoring_type)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          <StatGrid
            metrics={[
              { label: texts.challenge.attempts, value: myAttempts.length, unit: `/${challenge?.max_attempts ?? 2}` },
              { label: texts.challenge.formScore, value: lastAttempt?.form_score?.toFixed(1) ?? '-' },
              { label: texts.challenge.totalVolume, value: lastAttempt?.total_volume?.toFixed(0) ?? '-' },
            ]}
          />

          {/* Coach Demo Video */}
          {challenge?.video_url ? (
            <View style={styles.section}>
              <SectionHeader title="Video demo" icon={<PlayIcon size={18} color={colors.primary} />} />
              <View style={styles.videoCard}>
                <PrimaryButton
                  label="Ver video demo"
                  variant="outline"
                  onPress={() => {
                    Alert.alert('Proximamente', 'El reproductor de video se habilitara pronto.');
                  }}
                />
              </View>
            </View>
          ) : null}

          {/* My Last Attempt */}
          {lastAttempt ? (
            <View style={styles.section}>
              <SectionHeader title={texts.challenge.scoreBreakdown} icon={<CheckIcon size={18} color={colors.success} />} />
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{texts.challenge.formScore}</Text>
                  <Text style={styles.statValue}>{lastAttempt.form_score?.toFixed(1) ?? '-'}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Profundidad</Text>
                  <Text style={styles.statValue}>{lastAttempt.depth_score?.toFixed(1) ?? '-'}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Alineacion</Text>
                  <Text style={styles.statValue}>{lastAttempt.alignment_score?.toFixed(1) ?? '-'}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Tempo</Text>
                  <Text style={styles.statValue}>{lastAttempt.tempo_score?.toFixed(1) ?? '-'}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* My Attempts */}
          {myAttempts.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={`${texts.challenge.attempts} (${myAttempts.length})`} />
              {myAttempts.slice(0, 5).map((a) => (
                <View key={a.id} style={styles.attemptCard}>
                  <View style={styles.attemptHeader}>
                    <Text style={styles.attemptTitle}>
                      {texts.challenge.attemptN.replace('{n}', String(a.attempt_number))}
                    </Text>
                    <Text style={styles.attemptDate}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.attemptScores}>
                    <Text style={styles.attemptScore}>Forma: {a.form_score?.toFixed(1) ?? '-'}</Text>
                    <Text style={styles.attemptScore}>Prof: {a.depth_score?.toFixed(1) ?? '-'}</Text>
                    {a.total_volume != null && (
                      <Text style={styles.attemptScore}>Vol: {a.total_volume.toFixed(0)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.section}>
              <EmptyState
                variant="empty"
                title={texts.challenge.noAttempts}
                message="Participa registrando tu primer intento."
              />
            </View>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title={texts.challenge.leaderboard}
                icon={<TrophyIcon size={18} color={colors.primary} />}
                action={{ label: texts.common.seeAll, onPress: () => navigation.navigate('Leaderboard', { challengeId }) }}
              />
              {leaderboard.slice(0, 5).map((entry) => (
                <View key={entry.athlete_id} style={styles.leaderboardEntry}>
                  <View style={styles.leaderboardPosition}>
                    <Text style={[
                      styles.leaderboardPositionText,
                      entry.rank <= 3 && { color: colors.primary }
                    ]}>
                      {entry.rank}
                    </Text>
                  </View>
                  <Text style={styles.leaderboardName} numberOfLines={1}>
                    {entry.athlete_name}
                  </Text>
                  <Text style={styles.leaderboardScore}>
                    {entry.best_score.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* CTA */}
      {!isExpired && canAttempt && (
        <View style={styles.ctaWrap}>
          {currentAttemptId ? (
            <PrimaryButton
              label={texts.challenge.submitAttempt}
              onPress={() => navigation.navigate('ChallengeRecording', { challengeId, attemptId: currentAttemptId })}
            />
          ) : (
            <PrimaryButton
              label={texts.challenge.join}
              onPress={handleJoin}
              loading={joinMutation.isPending}
            />
          )}
        </View>
      )}

      {isExpired && (
        <View style={styles.ctaWrap}>
          <PrimaryButton
            label={texts.challenge.expired}
            variant="ghost"
            onPress={() => {}}
            disabled
          />
        </View>
      )}

      <ConsentDialog
        visible={showConsent}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        loading={joinMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  loadingWrap: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  countdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  exerciseText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(59, 158, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  scoreBadgeText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '600',
  },
  section: { gap: spacing.sm },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  attemptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attemptTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  attemptDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  attemptScores: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  attemptScore: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  leaderboardPosition: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardPositionText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  leaderboardName: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  leaderboardScore: {
    ...typography.metricSM,
    color: colors.primary,
  },
  ctaWrap: { padding: spacing.md, paddingTop: 0 },
});
