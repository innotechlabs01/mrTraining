import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import type { RunningInfo } from './eventDetailTypes';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventRunningInfoCard;

type Props = {
  running: RunningInfo;
};

/** Running-race details card: distance, pace, elevation, meeting point, categories, and route link. */
export function EventRunningInfoCard({ running }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>{t.numbers}</Text>
      {running.distanceKm != null ? (
        <Text style={styles.meta}>Distancia: {running.distanceKm} km</Text>
      ) : null}
      {running.pace ? <Text style={styles.meta}>Ritmo objetivo: {running.pace} min/km</Text> : null}
      {running.elevationM != null ? (
        <Text style={styles.meta}>Desnivel positivo: +{running.elevationM} m</Text>
      ) : null}
      {running.meetingPoint ? (
        <Text style={styles.meta}>Punto de encuentro: {running.meetingPoint}</Text>
      ) : null}
      {running.categories && running.categories.length > 0 ? (
        <View style={styles.categoriesRow}>
          {running.categories.map((cat) => (
            <View key={cat} style={styles.chip}>
              <Text style={styles.chipText}>{cat}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {running.routeUrl ? (
        <Pressable
          onPress={() => {
            void Linking.openURL(running.routeUrl!).catch(() => {});
          }}
          style={styles.routeBtn}
        >
          <Text style={styles.routeBtnText}>Ver ruta / mapa de la carrera →</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.primary },
  meta: { ...typography.body, color: colors.textSecondary },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
  },
  chipText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  routeBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    alignItems: 'center',
  },
  routeBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
