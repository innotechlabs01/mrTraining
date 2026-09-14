import React from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { FireIcon, UserIcon, TrendUpIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

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

export function CoachChallengesScreen() {
  const navigation = useNavigation<Nav>();

  const { data: challenges, isLoading, isError, refetch } = useQuery({
    queryKey: ['coach-challenges'],
    queryFn: fetchCoachChallenges,
    staleTime: 30_000,
  });

  const renderChallenge = ({ item }: { item: Challenge }) => (
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
            {item.status === 'active' ? 'Activo' : item.status}
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
            {item.athlete_id ? 'Asignado' : 'Abierto'}
          </Text>
        </View>
        <Text style={styles.footerDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Mis Desafíos" onBack={() => navigation.goBack()} />

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
          title="Error al cargar"
          message="No se pudieron cargar los desafíos."
          onRetry={() => refetch()}
        />
      ) : challenges?.length === 0 ? (
        <EmptyState
          variant="empty"
          title="Sin desafíos"
          message="Crea tu primer desafío de video para tus atletas."
        />
      ) : (
        <FlatList
          data={challenges}
          renderItem={renderChallenge}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.ctaWrap}>
        <PrimaryButton
          label="Crear desafío"
          onPress={() => {
            // TODO: Navigate to create challenge screen
            navigation.navigate('CreateChallenge' as any);
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
