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
import { Badge } from '../../../../shared/components/ui/Badge';
import { Card } from '../../../../shared/components/ui/Card';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { CheckIcon } from '../../../../shared/components/icons';
import { useRecoveryData, type RecoveryState } from '../../hooks/useRecoveryData';

const PLATFORM_LABEL: Record<string, string> = {
  healthkit: 'Apple Health',
  healthconnect: 'Health Connect',
  garmin: 'Garmin Connect',
};

function scoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.error;
}

function scoreColorOf(score: number | null | undefined): string {
  return score == null ? colors.border : scoreColor(score);
}

function readinessBadge(recovery: RecoveryState): { text: string; tone: 'success' | 'neutral' | 'warning' } {
  if (recovery.readinessScore == null) return { text: 'SIN DATOS', tone: 'warning' };
  return recovery.scoreSource === 'automatic'
    ? { text: 'AUTOMÁTICO', tone: 'success' }
    : { text: 'AUTO-REPORTE', tone: 'neutral' };
}

function fmtMin(minutes?: number): string {
  if (!minutes) return '—';
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function hrvDeltaLabel(today: number | null, baseline: number | null): string | undefined {
  if (today == null || baseline == null || baseline === 0) return undefined;
  const pct = Math.round(((today - baseline) / baseline) * 100);
  return pct >= 0 ? `+${pct}% vs base` : `${pct}% vs base`;
}

function rhrDeltaLabel(today: number | null, baseline: number | null): string | undefined {
  if (today == null || baseline == null) return undefined;
  const delta = today - baseline;
  return delta === 0 ? '= base' : `${delta > 0 ? '+' : ''}${Math.round(delta)} bpm vs base`;
}

function StatCard({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

/** Tiny bar trend — no chart dependency, real data only. */
function SleepTrend({ nights }: { nights: Array<{ date: string; value: number }> }) {
  if (nights.length === 0) return null;
  const maxH = Math.max(8, ...nights.map(n => n.value));
  return (
    <View style={styles.trendRow}>
      {nights.slice(-7).map((night) => {
        const heightPct = Math.round((Math.min(night.value, maxH) / maxH) * 100);
        return (
          <View key={night.date} style={styles.trendCol}>
            <View style={styles.trendBarTrack}>
              <View style={[styles.trendBarFill, { height: `${heightPct}%` as `${number}%` }]} />
            </View>
            <Text style={styles.trendValue}>{night.value.toFixed(1)}</Text>
            <Text style={styles.trendDate}>{night.date.slice(8)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function RecoveryScreen() {
  const recovery = useRecoveryData();
  const [manualInput, setManualInput] = useState('');
  const [manualSaved, setManualSaved] = useState(false);

  const { lastNight, hrvToday, hrvBaseline, rhrToday, rhrBaseline } = recovery;

  // Recommendations derive only from measured signals.
  const recommendations: string[] = [];
  if (lastNight && lastNight.totalMinutes < 420) {
    recommendations.push('Dormiste menos de 7 horas. Prioriza acostarte temprano hoy.');
  }
  if (hrvToday != null && hrvBaseline != null && hrvToday < hrvBaseline * 0.85) {
    recommendations.push('Tu HRV está por debajo de tu promedio. Considerá una sesión suave.');
  }
  if (rhrToday != null && rhrBaseline != null && rhrToday > rhrBaseline + 5) {
    recommendations.push('Tu pulso en reposo está elevado. Hidratación y descanso primero.');
  }
  if (recommendations.length === 0 && recovery.readinessScore != null && recovery.readinessScore >= 80) {
    recommendations.push('Estás recuperado. Buen momento para una sesión de alta intensidad.');
  }

  const saveManual = async () => {
    const n = parseFloat(manualInput);
    if (Number.isNaN(n) || n < 1 || n > 10) return;
    const ok = await recovery.saveManualReadiness(n);
    setManualSaved(ok);
    if (ok) setManualInput('');
  };

  const badge = readinessBadge(recovery);

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
        <Text style={styles.eyebrow}>RECUPERACIÓN</Text>
        <Text style={styles.title}>Recuperación</Text>

        {recovery.loading ? (
          <EmptyState variant="loading" message="Leyendo tus datos…" />
        ) : !recovery.bridgeAvailable && recovery.scoreSource === 'none' ? (
          <EmptyState
            variant="empty"
            message="Sin reloj conectado. Conecta Apple Health o Health Connect para medir tu recuperación automáticamente."
          />
        ) : recovery.error ? (
          <EmptyState variant="error" message={recovery.error} onRetry={() => recovery.syncNow()} />
        ) : (
          <>
            {/* Readiness hero */}
            <View style={styles.scoreHero}>
              <View style={[styles.outerRing, { borderColor: `${scoreColorOf(recovery.readinessScore)}4D` }]}>
                <View style={[styles.innerCircle, { backgroundColor: scoreColorOf(recovery.readinessScore) }]}>
                  <Text style={styles.scoreValue}>{recovery.readinessScore ?? '—'}</Text>
                </View>
              </View>
              <Badge text={badge.text} tone={badge.tone} />
              <Text style={styles.scoreHint}>
                {recovery.scoreSource === 'automatic'
                  ? 'Basado en tu HRV, sueño y pulso en reposo'
                  : recovery.scoreSource === 'manual'
                    ? 'Tu último auto-reporte — conecta tu reloj para el automático'
                    : 'Sin datos suficientes todavía'}
              </Text>
            </View>

            {/* Permission banner */}
            {recovery.needsPermission ? (
              <Card style={styles.connectBanner}>
                <Text style={styles.connectTitle}>Permite el acceso a tus datos de salud</Text>
                <Text style={styles.connectBody}>
                  Leemos HRV, sueño y pulso desde {PLATFORM_LABEL[recovery.platform ?? ''] ?? 'tu plataforma de salud'}.
                </Text>
                <PrimaryButton label="Conceder permiso" onPress={() => recovery.grantPermissions()} disabled={recovery.syncing} />
              </Card>
            ) : null}

            {/* Today's stats */}
            <View style={styles.statsRow}>
              <StatCard
                value={lastNight ? `${(lastNight.totalMinutes / 60).toFixed(1)}h` : '—'}
                label="Sueño"
                detail={
                  lastNight?.deepMinutes || lastNight?.remMinutes
                    ? `Deep ${fmtMin(lastNight.deepMinutes)} · REM ${fmtMin(lastNight.remMinutes)}`
                    : undefined
                }
              />
              <StatCard
                value={hrvToday != null ? String(Math.round(hrvToday)) : '—'}
                label="HRV ms"
                detail={hrvDeltaLabel(hrvToday, hrvBaseline)}
              />
              <StatCard
                value={rhrToday != null ? String(rhrToday) : '—'}
                label="RHR bpm"
                detail={rhrDeltaLabel(rhrToday, rhrBaseline)}
              />
            </View>

            {/* Sleep trend */}
            {recovery.sleepTrend.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>SUEÑO · ÚLTIMOS DÍAS</Text>
                <SleepTrend nights={recovery.sleepTrend} />
              </>
            ) : null}

            {/* Manual check-in lives beside the automatic data, never replaces it */}
            {!manualSaved ? (
              <Card style={styles.manualCard}>
                <Text style={styles.manualTitle}>¿Cómo te sentís hoy?</Text>
                <Text style={styles.manualHint}>Auto-evaluá tu recuperación del 1 al 10</Text>
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
                  <PrimaryButton label="Guardar" onPress={() => saveManual()} disabled={!manualInput} />
                </View>
              </Card>
            ) : (
              <Card style={styles.manualCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <CheckIcon size={16} color={colors.success} />
                  <Text style={styles.manualTitle}>Auto-reporte guardado</Text>
                </View>
              </Card>
            )}

            {/* Recommendations from real signals only */}
            {recommendations.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>RECOMENDACIONES</Text>
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

  scoreHero: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  outerRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  innerCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontFamily: typography.statsNumber.fontFamily, fontSize: 36, fontWeight: '800', color: colors.text, lineHeight: 36 },
  scoreHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  connectBanner: { gap: spacing.sm, padding: spacing.md },
  connectTitle: { ...typography.bodyStrong, color: colors.text },
  connectBody: { ...typography.caption, color: colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.primary, lineHeight: 28 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.textSecondary, textTransform: 'uppercase' },
  statDetail: { fontSize: 11, fontWeight: '400', color: colors.textSecondary, marginTop: spacing.xs },

  sectionEyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    color: colors.textSecondary, marginBottom: spacing.md,
  },

  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg },
  trendCol: { flex: 1, alignItems: 'center', gap: 2 },
  trendBarTrack: { height: 72, width: '100%', justifyContent: 'flex-end' },
  trendBarFill: { backgroundColor: colors.primary, borderRadius: 6, minHeight: 4 },
  trendValue: { ...typography.caption, color: colors.textSecondary },
  trendDate: { ...typography.caption, color: colors.textSecondary, opacity: 0.6 },

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
