/**
 * Recovery Lab — real data only.
 *
 * Automatic readiness comes from the athlete's own wearable baselines (HRV, sleep,
 * resting HR). Without a connected watch it falls back to the manual self-check-in.
 * Every number on this screen is either measured or athlete-entered; there are no
 * defaults and no demo values.
 */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { CheckIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';
import { useRecoveryData } from '../../hooks/useRecoveryData';
import { useRecommendations } from '../../hooks/useRecommendations';
import { ReadinessHero } from '../components/ReadinessHero';
import { RecoveryStatCard } from '../components/RecoveryStatCard';
import { SleepTrend } from '../components/SleepTrend';
import { PLATFORM_LABEL, fmtMin, hrvDeltaLabel, rhrDeltaLabel } from '../components/recoveryFormat';

const tr = texts.screens.recovery;

export function RecoveryScreen() {
  const recovery = useRecoveryData();
  const recommendations = useRecommendations(recovery);
  const [manualInput, setManualInput] = useState('');
  const [manualSaved, setManualSaved] = useState(false);

  const { lastNight, hrvToday, hrvBaseline, rhrToday, rhrBaseline } = recovery;

  const saveManual = async () => {
    const n = parseFloat(manualInput);
    if (Number.isNaN(n) || n < 1 || n > 10) return;
    const ok = await recovery.saveManualReadiness(n);
    setManualSaved(ok);
    if (ok) setManualInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={recovery.syncing}
            onRefresh={() => recovery.syncNow()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.eyebrow}>{tr.eyebrow}</Text>
        <Text style={styles.title}>{tr.title}</Text>

        {recovery.loading ? (
          <EmptyState variant="loading" message={tr.loading} />
        ) : !recovery.bridgeAvailable && recovery.scoreSource === 'none' ? (
          <EmptyState
            variant="empty"
            message={tr.emptyNoWatch}
          />
        ) : recovery.error ? (
          <EmptyState variant="error" message={recovery.error} onRetry={() => recovery.syncNow()} />
        ) : (
          <>
            {/* Readiness hero */}
            <ReadinessHero recovery={recovery} />

            {/* Permission banner */}
            {recovery.needsPermission ? (
              <Card style={styles.connectBanner}>
                <Text style={styles.connectTitle}>{tr.permissionTitle}</Text>
                <Text style={styles.connectBody}>
                  {tr.permissionBody.replace('{platform}', PLATFORM_LABEL[recovery.platform ?? ''] ?? tr.defaultPlatform)}
                </Text>
                <PrimaryButton label={tr.grantPermission} onPress={() => recovery.grantPermissions()} disabled={recovery.syncing} />
              </Card>
            ) : null}

            {/* Today's stats */}
            <View style={styles.statsRow}>
              <RecoveryStatCard
                value={lastNight ? `${(lastNight.totalMinutes / 60).toFixed(1)}h` : '—'}
                label={tr.sleepLabel}
                detail={
                  lastNight?.deepMinutes || lastNight?.remMinutes
                    ? `${tr.deepLabel} ${fmtMin(lastNight.deepMinutes)} · ${tr.remLabel} ${fmtMin(lastNight.remMinutes)}`
                    : undefined
                }
              />
              <RecoveryStatCard
                value={hrvToday != null ? String(Math.round(hrvToday)) : '—'}
                label={tr.hrvLabel}
                detail={hrvDeltaLabel(hrvToday, hrvBaseline)}
              />
              <RecoveryStatCard
                value={rhrToday != null ? String(rhrToday) : '—'}
                label={tr.rhrLabel}
                detail={rhrDeltaLabel(rhrToday, rhrBaseline)}
              />
            </View>

            {/* Sleep trend */}
            {recovery.sleepTrend.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>{tr.sleepTrendTitle}</Text>
                <SleepTrend nights={recovery.sleepTrend} />
              </>
            ) : null}

            {/* Manual check-in lives beside the automatic data, never replaces it */}
            {!manualSaved ? (
              <Card style={styles.manualCard}>
                <Text style={styles.manualTitle}>{tr.manualTitle}</Text>
                <Text style={styles.manualHint}>{tr.manualHint}</Text>
                <View style={styles.manualRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={manualInput}
                      onChangeText={setManualInput}
                      placeholder="1-10"
                      keyboardType="numeric"
                      inputMode="numeric"
                    />
                  </View>
                  <PrimaryButton label={tr.manualSave} onPress={() => saveManual()} disabled={!manualInput} />
                </View>
              </Card>
            ) : (
              <Card style={styles.manualCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <CheckIcon size={16} color={colors.success} />
                  <Text style={styles.manualTitle}>{tr.manualSaved}</Text>
                </View>
              </Card>
            )}

            {/* Recommendations from real signals only */}
            {recommendations.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>{tr.recommendationsTitle}</Text>
                {recommendations.map((rec, i) => (
                  <Card key={`rec-${i}`} style={styles.recCard}>
                    <View style={styles.recAccent} />
                    <Text style={styles.recText}>{rec}</Text>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, paddingBottom: 100 },
  eyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 3,
    color: colors.primary, marginBottom: spacing.xs,
  },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34, marginBottom: spacing.lg, color: colors.text },

  connectBanner: { gap: spacing.sm, padding: spacing.md },
  connectTitle: { ...typography.bodyStrong, color: colors.text },
  connectBody: { ...typography.caption, color: colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  sectionEyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    color: colors.textSecondary, marginBottom: spacing.md,
  },

  manualCard: { gap: spacing.xs, padding: spacing.md, marginBottom: spacing.md },
  manualTitle: { ...typography.bodyStrong, color: colors.text },
  manualHint: { ...typography.caption, color: colors.textSecondary },
  manualRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.xs },

  recCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: spacing.md, paddingLeft: spacing.lg, marginBottom: spacing.sm,
    overflow: 'hidden', position: 'relative', gap: spacing.md,
  },
  recAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: colors.primary,
  },
  recText: { flex: 1, ...typography.body, color: colors.text, lineHeight: 20 },
});
