import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing, typography } from '../../theme/tokens';

type Props = {
  endDate: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

function getDaysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getStatus(endDate: string) {
  const days = getDaysRemaining(endDate);
  if (days <= 0) return { label: 'Vencido', urgent: false, color: colors.textSecondary };
  if (days === 1) return { label: 'Ultimo dia', urgent: true, color: colors.error };
  if (days <= 3) return { label: `${days} dias`, urgent: true, color: colors.warning };
  return { label: `${days} dias`, urgent: false, color: colors.primary };
}

export function CountdownTimer({ endDate, showLabel = true, size = 'md' }: Props) {
  const status = getStatus(endDate);

  const sizeStyles = {
    sm: { number: typography.metricSM, label: typography.bodySmall },
    md: { number: typography.metricMD, label: typography.body },
    lg: { number: typography.metricLG, label: typography.bodyLG },
  };

  return (
    <View style={[styles.container, status.urgent && styles.urgent]}>
      <Text style={[styles.number, sizeStyles[size].number, { color: status.color }]}>
        {getDaysRemaining(endDate)}
      </Text>
      {showLabel && (
        <Text style={[styles.label, sizeStyles[size].label, { color: status.color }]}>
          {status.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  urgent: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: radius.sm,
  },
  number: {},
  label: {},
});
