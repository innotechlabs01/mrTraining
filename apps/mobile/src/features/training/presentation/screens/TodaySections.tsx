/**
 * TodaySections — presentational sections below the training hero.
 *
 * Training-first: "Sesiones de Hoy" es lo único que compite con el hero.
 * La Comunidad / Artículos / Alertas viven en un accordion plegable
 * ("Comunidad & Novedades") que arranca colapsado para no hundir la intención.
 * Data + navigation callbacks vienen del parent.
 */
import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { SessionListCard } from '../../../../shared/components/ui/SessionListCard';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { AlertIcon, ChevronDownIcon, ChevronRightIcon, NewspaperIcon, ChatIcon, TrophyIcon } from '../../../../shared/components/icons';
import type { Alert } from '../../../../features/alerts/alertService';
import type { CommunityMessage } from '../../../../features/community/communityService';
import type { BlogPost } from '../../../../features/blog/blogService';
import { formatPRValue, type PersonalRecord } from '../../../../features/gamification/domain/prService';

export function SessionsSection({
  sessions,
}: {
  sessions: Array<{ id: string; name: string; time: string; endTime: string; location: string }>;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Sesiones de Hoy" />
      {sessions.length === 0 ? (
        <EmptyState variant="empty" message="Sin sesiones programadas" />
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

function CommunityBlock({
  latestMessage,
  onPress,
}: {
  latestMessage: Pick<CommunityMessage, 'userName' | 'message'> | null;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.chatCard}>
      <View style={styles.chatTopRow}>
        <ChatIcon size={16} color={colors.primary} />
        <Text style={styles.chatLabel}>Comunidad</Text>
        <Text style={styles.chatAffordance}>Ver chat</Text>
        <ChevronRightIcon size={16} color={colors.textSecondary} />
      </View>
      {latestMessage ? (
        <>
          <Text style={styles.chatSender} numberOfLines={1}>
            {latestMessage.userName}
          </Text>
          <Text style={styles.chatMessage} numberOfLines={1}>
            {latestMessage.message}
          </Text>
        </>
      ) : (
        <Text style={styles.chatEmpty}>Sin mensajes todavía</Text>
      )}
    </Card>
  );
}

function ArticlesBlock({
  posts,
  onPressAll,
  onPressPost,
}: {
  posts: BlogPost[];
  onPressAll: () => void;
  onPressPost: () => void;
}) {
  if (posts.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Artículos"
        action={posts.length > 0 ? { label: 'Ver todo', onPress: onPressAll } : undefined}
      />
      <View style={styles.list}>
        {posts.map((post) => (
          <Card key={post.id} onPress={onPressPost} style={styles.articleRowCard}>
            <View style={styles.cardAccent} />
            <Text style={styles.articleRowTitle} numberOfLines={2}>
              {post.title}
            </Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

function AlertsBlock({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <Card style={styles.alertCard}>
      {alerts.slice(0, 2).map((a, i) => (
        <View key={`${a.id ?? a.type}-${i}`} style={[styles.alertRow, i > 0 && styles.alertBorder]}>
          <AlertIcon
            size={16}
            color={a.severity === 'high' ? colors.error : a.severity === 'medium' ? colors.warning : colors.info}
          />
          <View style={styles.alertBody}>
            <Text style={styles.alertTitle}>{a.title}</Text>
            <Text style={styles.alertMessage} numberOfLines={2}>
              {a.message}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

export function NewsFeedSection({
  latestMessage,
  posts,
  alerts,
  onPressCommunity,
  onPressArticles,
}: {
  latestMessage: Pick<CommunityMessage, 'userName' | 'message'> | null;
  posts: BlogPost[];
  alerts: Alert[];
  onPressCommunity: () => void;
  onPressArticles: () => void;
}) {
  const [open, setOpen] = useState(true);
  const hasContent = !!latestMessage || posts.length > 0 || alerts.length > 0;

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Comunidad y Novedades"
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}
      >
        <NewspaperIcon size={18} color={colors.primary} />
        <Text style={styles.accordionTitle}>Comunidad & Novedades</Text>
        <View style={[styles.chevronWrap, open && styles.chevronOpen]}>
          <ChevronDownIcon size={18} color={colors.textSecondary} />
        </View>
      </Pressable>
      {open && (
        <View style={styles.accordionBody}>
          {hasContent ? (
            <>
              <CommunityBlock latestMessage={latestMessage} onPress={onPressCommunity} />
              <ArticlesBlock posts={posts} onPressAll={onPressArticles} onPressPost={onPressArticles} />
              <AlertsBlock alerts={alerts} />
            </>
          ) : (
            <EmptyState variant="empty" message="Sin novedades todavía" />
          )}
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
      <SectionHeader title="Desafíos" action={{ label: 'Ver todos', onPress: onPressChallenges }} />
      {hasChallenge ? null : (
        <EmptyState
          variant="empty"
          message="No hay un desafío activo — entrá a la sección Desafíos para unirte"
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
      <SectionHeader title="Mejores Marcas" action={onPress ? { label: 'Ver todo', onPress } : undefined} />
      {recent.length === 0 ? (
        <EmptyState variant="empty" message="Subí tus marcas al entrenar" />
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
  pressableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
  },
  accordionTitle: { ...typography.h4, color: colors.text, flex: 1 },
  accordionBody: { gap: spacing.md },
  pressed: { opacity: 0.7 },
  chevronWrap: { transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  chatCard: { gap: spacing.xs },
  chatTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatLabel: { ...typography.overline, color: colors.primary, flex: 1 },
  chatAffordance: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, color: colors.textSecondary },
  chatSender: { ...typography.bodyStrong, color: colors.text, fontSize: 14, marginTop: spacing.sm },
  chatMessage: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  chatEmpty: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  articleRowCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.primary },
  articleRowTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 20, paddingVertical: spacing.xs },
  alertCard: { padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  alertBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  alertBody: { flex: 1 },
  alertTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 13 },
  alertMessage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
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