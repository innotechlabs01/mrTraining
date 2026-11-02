import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Badge } from '../../../../shared/components/ui/Badge';
import { Card } from '../../../../shared/components/ui/Card';
import type { EventItem } from './eventDetailTypes';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

type Props = {
  event: EventItem | undefined;
};

/** Header card with type badge, title, date/time, modality, location, description. */
export function EventInfoCard({ event: ev }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.metaRow}>
        {ev?.type ? <Badge text={ev.type} tone="primary" /> : null}
      </View>
      <Text style={styles.cardTitle}>{ev?.title}</Text>
      <Text style={styles.meta}>
        {formatDate(ev?.date)}
        {ev?.time ? ` · ${ev.time}` : ''}
        {ev?.endTime ? ` - ${ev.endTime}` : ''}
      </Text>
      {ev?.modality ? <Text style={styles.meta}>Modalidad: {ev.modality}</Text> : null}
      {ev?.location ? <Text style={styles.meta}>{ev.location}</Text> : null}
      {ev?.description ? <Text style={styles.description}>{ev.description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.title, color: colors.text },
  meta: { ...typography.body, color: colors.textSecondary },
  description: { ...typography.body, color: colors.text, marginTop: spacing.xs },
});
