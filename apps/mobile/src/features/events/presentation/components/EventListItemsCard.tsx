import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventListItemsCard;

type Props = {
  items: string[];
};

/** Bulleted t.sectionTitle card listing the event's items. */
export function EventListItemsCard({ items }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>{t.sectionTitle}</Text>
      {items.map((item, idx) => (
        <View key={`${item}-${idx}`} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.primary },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  bulletText: { ...typography.body, color: colors.text, flex: 1 },
});
