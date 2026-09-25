/**
 * ProfileHeader — compact identity bar (avatar + name + email + plan).
 * Small, integrated — no hero stats. Extra personal data lives in the
 * "Información personal" module screen.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';

type Props = {
  initials: string;
  name: string;
  email: string;
  plan?: string | null;
};

export function ProfileHeader({ initials, name, email, plan }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>
      </View>
      {plan ? (
        <View style={styles.planPill}>
          <Text style={styles.planText} numberOfLines={1}>
            {plan}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h4, color: colors.primary },
  body: { flex: 1, gap: 2, minWidth: 0 },
  name: { ...typography.h4, color: colors.text },
  email: { ...typography.caption, color: colors.textSecondary, fontWeight: '400' },
  planPill: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 120,
  },
  planText: { ...typography.overline, color: colors.primary },
});