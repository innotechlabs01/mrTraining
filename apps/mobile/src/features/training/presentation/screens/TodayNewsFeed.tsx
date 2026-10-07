/**
 * TodayNewsFeed — community/chat + articles + alerts accordion for Today.
 *
 * Extracted from `TodaySections.tsx` (250-line budget). Comunidad / Artículos /
 * Alertas live in a collapsible accordion that starts open.
 */
import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { texts } from '../../../../shared/i18n/texts';
import { Card } from '../../../../shared/components/ui/Card';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { AlertIcon, ChevronDownIcon, ChevronRightIcon, NewspaperIcon, ChatIcon } from '../../../../shared/components/icons';
import type { Alert } from '../../../../features/alerts/alertService';
import type { CommunityMessage } from '../../../../features/community/communityService';
import type { BlogPost } from '../../../../features/blog/blogService';

const t = texts.screens.todaySections;

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
        <Text style={styles.chatLabel}>{t.communityLabel}</Text>
        <Text style={styles.chatAffordance}>{t.communitySeeChat}</Text>
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
        <Text style={styles.chatEmpty}>{t.chatEmpty}</Text>
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
        title={t.articlesTitle}
        action={posts.length > 0 ? { label: texts.common.seeAll, onPress: onPressAll } : undefined}
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
        accessibilityLabel={t.newsA11y}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}
      >
        <NewspaperIcon size={18} color={colors.primary} />
        <Text style={styles.accordionTitle}>{t.newsTitle}</Text>
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
            <EmptyState variant="empty" message={t.newsEmpty} />
          )}
        </View>
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
});
