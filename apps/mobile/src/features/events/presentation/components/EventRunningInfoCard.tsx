import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import type { RunningInfo } from './eventDetailTypes';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventRunningInfoCard;

type Props = {
  running: RunningInfo;
};

/** Running-session details card: distance, pace, meeting point. */
export function EventRunningInfoCard({ running }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>{t.numbers}</Text>
      {running.distanceKm != null ? (
        <Text style={styles.meta}>Distancia: {running.distanceKm} km</Text>
      ) : null}
      {running.pace ? <Text style={styles.meta}>Ritmo: {running.pace}</Text> : null}
      {running.meetingPoint ? (
        <Text style={styles.meta}>Encuentro: {running.meetingPoint}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.primary },
  meta: { ...typography.body, color: colors.textSecondary },
});
