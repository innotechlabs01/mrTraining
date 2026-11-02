/**
 * TodaySections — presentational sections below the training hero.
 *
 * Training-first: "Sesiones de Hoy" es lo único que compite con el hero.
 * La Comunidad / Artículos / Alertas viven en un accordion plegable
 * ("Comunidad & Novedades") que arranca colapsado para no hundir la intención.
 * Data + navigation callbacks vienen del parent.
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { texts } from '../../../../shared/i18n/texts';
import { NewsFeedSection } from './TodayNewsFeed';

export { NewsFeedSection };

const t = texts.screens.todaySections;
import { Card } from '../../../../shared/components/ui/Card';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { SessionListCard } from '../../../../shared/components/ui/SessionListCard';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { TrophyIcon } from '../../../../shared/components/icons';
import { formatPRValue, type PersonalRecord } from '../../../../features/gamification/domain/prService';

export function SessionsSection({
  sessions,
}: {
  sessions: Array<{ id: string; name: string; time: string; endTime: string; location: string }>;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader title={t.sessionsTitle} />
      {sessions.length === 0 ? (
        <EmptyState variant="empty" message={t.sessionsEmpty} />
      ) : (
        <View style={styles.list}>
          {sessions.map((s) => (
            <SessionListCard
              key={s.id}
              title={s.name}
              meta={`${s.time} — ${s.endTime}${s.location ? ` · ${s.location}` : ''}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function ChallengeSection({
  hasChallenge,
  onPressChallenges,
}: {
  hasChallenge: boolean;
  onPressChallenges: () => void;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader title={t.challengesTitle} action={{ label: t.challengesSeeAll, onPress: onPressChallenges }} />
      {hasChallenge ? null : (
        <EmptyState
          variant="empty"
          message={t.challengeEmpty}
        />
      )}
    </View>
  );
}

export function PRsSection({
  prs,
  onPress,
}: {
  prs: PersonalRecord[];
  onPress?: () => void;
}) {
  const recent = prs.slice(0, 3);

  return (
    <View style={styles.section}>
      <SectionHeader title={t.prsTitle} action={onPress ? { label: texts.common.seeAll, onPress } : undefined} />
      {recent.length === 0 ? (
        <EmptyState variant="empty" message={t.prsEmpty} />
      ) : (
        <Card style={styles.prCard}>
          {recent.map((pr, i) => (
            <View key={pr.exerciseId} style={[styles.prRow, i > 0 && styles.prBorder]}>
              <View style={styles.prIcon}>
                <TrophyIcon size={16} color={colors.primary} />
              </View>
              <View style={styles.prBody}>
                <Text style={styles.prName} numberOfLines={1}>
                  {pr.exerciseName}
                </Text>
                <Text style={styles.prDate}>
                  {new Date(pr.achievedAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.prValue}>{formatPRValue(pr.bestValue, pr.unit)}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { gap: spacing.md },
  prCard: { padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  prBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  prIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBody: { flex: 1, gap: 1, minWidth: 0 },
  prName: { ...typography.bodyStrong, color: colors.text, fontSize: 13 },
  prDate: { ...typography.caption, color: colors.textSecondary },
  prValue: { ...typography.metricSM, color: colors.primary },
});
