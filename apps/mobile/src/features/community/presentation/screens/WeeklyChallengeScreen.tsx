import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { FireIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type WeeklyChallenge = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  calories: number;
  participantsCount: number;
};

async function fetchWeeklyChallenge(): Promise<WeeklyChallenge | null> {
  const { data } = await apiClient.get('/athlete/community/challenges/weekly');
  const payload = (data as any)?.data ?? data;
  return (payload as WeeklyChallenge) ?? null;
}

export function WeeklyChallengeScreen() {
  const navigation = useNavigation<Nav>();

  const { data: challenge, isLoading, isError, refetch } = useQuery({
    queryKey: ['weeklyChallenge'],
    queryFn: fetchWeeklyChallenge,
    staleTime: 60_000,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Desafío semanal" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton.List rows={3} height={80} />
        </View>
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Error al cargar"
          message="No se pudo cargar el desafío semanal."
          onRetry={() => refetch()}
        />
      ) : !challenge ? (
        <EmptyState
          variant="empty"
          title="Sin datos todavía"
          message="Cuando haya un desafío activo, vas a ver aquí tu progreso semanal."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.challengeCard}>
            <View style={styles.iconCircle}>
              <FireIcon size={24} color={colors.primary} />
            </View>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeDescription}>{challenge.description}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{Math.ceil(challenge.durationMinutes / 1440)}</Text>
                <Text style={styles.statLabel}>días</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{challenge.calories}</Text>
                <Text style={styles.statLabel}>Kcal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{challenge.participantsCount}</Text>
                <Text style={styles.statLabel}>participantes</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <View style={styles.ctaWrap}>
        <PrimaryButton
          label={challenge ? 'Ver detalles' : 'Unirse'}
          onPress={() => {
            if (challenge) {
              navigation.navigate('ChallengeDetail', { challengeId: challenge.id });
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  skeletonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.lg },
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    textAlign: 'center',
  },
  challengeDescription: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 18,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  ctaWrap: { padding: spacing.md },
});
