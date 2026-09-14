import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, fontFamilies, radius, spacing, typography } from '../../theme/tokens';
import { TrophyIcon } from '../icons';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  avatarUrl?: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  title?: string;
}

function MedalColor({ rank }: { rank: number }) {
  switch (rank) {
    case 0: return colors.primary;
    case 1: return '#C0C0C0';
    case 2: return '#CD7F32';
    default: return colors.textSecondary;
  }
}

export function Leaderboard({ entries, currentUserId, title = 'Leaderboard del Grupo' }: LeaderboardProps) {
  const sorted = [...entries].sort((a, b) => b.points - a.points);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrophyIcon size={20} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.userId}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          const isCurrentUser = item.userId === currentUserId;
          return (
            <View
              style={[styles.row, isCurrentUser && styles.rowCurrent]}
              testID="leaderboard-row"
              accessibilityLabel={`Puesto ${index + 1}: ${item.name}, ${item.points} puntos`}
            >
              <View style={[styles.rankBadge, { backgroundColor: MedalColor({ rank: index }) + '20' }]}>
                <Text style={[styles.rankText, { color: MedalColor({ rank: index }) }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, isCurrentUser && styles.nameCurrent]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={[styles.points, isCurrentUser && styles.pointsCurrent]}>
                {item.points}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin datos de leaderboard</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  rowCurrent: {
    backgroundColor: `${colors.primary}10`,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.label,
    fontSize: 12,
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
  nameCurrent: {
    color: colors.primary,
    fontFamily: fontFamilies.bodySemiBold,
  },
  points: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  pointsCurrent: {
    color: colors.primary,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
