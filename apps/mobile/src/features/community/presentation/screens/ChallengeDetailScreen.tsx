import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { StatGrid } from '../../../../shared/components/ui/StatGrid';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { ConsentDialog } from '../../../../shared/components/ui/ConsentDialog';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { ChallengeAttemptsList } from '../components/ChallengeAttemptsList';
import { ChallengeCountdownCard } from '../components/ChallengeCountdownCard';
import { ChallengeHeaderCard } from '../components/ChallengeHeaderCard';
import { ChallengeLeaderboardPreview } from '../components/ChallengeLeaderboardPreview';
import { ChallengeScoreBreakdown } from '../components/ChallengeScoreBreakdown';
import { ChallengeVideoDemo } from '../components/ChallengeVideoDemo';
import type { ChallengeResponse } from '../components/challengeTypes';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.challengeDetail;

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ChallengeDetailRoute = RouteProp<RootStackParamList, 'ChallengeDetail'>;

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
      Alert.alert(t.joinedTitle, t.joinedBody);
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
    },
    onError: () => {
      Alert.alert(t.errorTitle, t.joinFailed);
    },
  });

  const challenge = response?.challenge;
  const attempts = response?.attempts ?? [];
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
            <ChallengeCountdownCard endDate={challenge.end_date} />
          )}

          {/* Challenge Header */}
          <ChallengeHeaderCard
            title={challenge?.title ?? texts.challenge.activeChallenge}
            description={challenge?.description}
            exerciseType={challenge?.exercise_type}
            scoreTypeLabel={challenge?.scoring_type ? getScoreTypeLabel(challenge.scoring_type) : null}
          />

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
            <ChallengeVideoDemo videoUrl={challenge.video_url} />
          ) : null}

          {/* My Last Attempt */}
          {lastAttempt ? (
            <ChallengeScoreBreakdown attempt={lastAttempt} />
          ) : null}

          {/* My Attempts */}
          <ChallengeAttemptsList attempts={myAttempts} />

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <ChallengeLeaderboardPreview
              entries={leaderboard}
              onSeeAll={() => navigation.navigate('Leaderboard', { challengeId })}
            />
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
  ctaWrap: { padding: spacing.md, paddingTop: 0 },
});
