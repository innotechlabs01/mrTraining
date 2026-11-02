import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '../../../shared/theme/tokens';
import { ClockIcon } from '../../../shared/components/icons';
import { texts } from '../../../shared/i18n/texts';

const t = texts.screens.pendingApproval;

type Props = {
  appointment?: {
    date: string;
    startTime: string;
    coachName: string;
  };
  onContactCoach: () => void;
};

export function PendingApprovalScreen({ appointment }: Props) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return t.tbd;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.statusCircle}>
          <ClockIcon size={40} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.body}>
          {t.body}
        </Text>

        {appointment && (
          <View style={styles.appointmentCard}>
            <Text style={styles.cardTitle}>{t.appointmentTitle}</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t.dateLabel}</Text>
              <Text style={styles.cardValue}>{formatDate(appointment.date)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t.timeLabel}</Text>
              <Text style={styles.cardValue}>{appointment.startTime || t.tbd}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t.coachLabel}</Text>
              <Text style={styles.cardValue}>{appointment.coachName}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {t.infoBody}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  statusCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: `${colors.primary}15`, borderWidth: 2, borderColor: `${colors.primary}30`, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: typography.h2.fontSize, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: typography.body.fontSize, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  appointmentCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: typography.bodyBold.fontSize, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  cardDivider: { height: 1, backgroundColor: colors.border },
  cardLabel: { fontSize: typography.bodyBold.fontSize, color: colors.textSecondary },
  cardValue: { fontSize: typography.bodyBold.fontSize, color: colors.text, fontWeight: '600' },
  infoBox: { backgroundColor: `${colors.primary}08`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${colors.primary}15` },
  infoText: { fontSize: typography.bodyBold.fontSize, color: colors.textSecondary, lineHeight: 20 },
});
