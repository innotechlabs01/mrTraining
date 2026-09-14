import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, radius, spacing, typography } from '@shared/theme/tokens';
import { ChatIcon } from '@shared/components/icons';

export interface CoachFeedItem {
  id: string;
  coachName: string;
  message: string;
  createdAt: string; // ISO date
  type: 'announcement' | 'feedback' | 'reminder' | 'challenge';
}

interface CoachFeedProps {
  items: CoachFeedItem[];
}

function typeBadgeColor(type: CoachFeedItem['type']): string {
  switch (type) {
    case 'announcement': return colors.primary;
    case 'feedback': return colors.success;
    case 'reminder': return colors.warning;
    case 'challenge': return colors.secondary;
  }
}

function typeLabel(type: CoachFeedItem['type']): string {
  switch (type) {
    case 'announcement': return 'Anuncio';
    case 'feedback': return 'Feedback';
    case 'reminder': return 'Recordatorio';
    case 'challenge': return 'Desafío';
  }
}

export function CoachFeed({ items }: CoachFeedProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ChatIcon size={20} color={colors.primary} />
        <Text style={styles.title}>Feed del Coach</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.item} testID="coach-feed-item">
            <View style={styles.itemHeader}>
              <Text style={styles.coachName}>{item.coachName}</Text>
              <View style={[styles.badge, { backgroundColor: typeBadgeColor(item.type) + '20' }]}>
                <Text style={[styles.badgeText, { color: typeBadgeColor(item.type) }]}>
                  {typeLabel(item.type)}
                </Text>
              </View>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay publicaciones del coach</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  item: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  coachName: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    ...typography.caption,
  },
  message: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
