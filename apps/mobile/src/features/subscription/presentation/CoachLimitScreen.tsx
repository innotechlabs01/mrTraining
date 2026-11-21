import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertIcon } from '../../../shared/components/icons';
import { PrimaryButton } from '../../../shared/components/ui/PrimaryButton';
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from '../../../shared/theme/tokens';

type Props = {
  planName: string;
  maxAthletes: number;
  athletesCount: number;
  onRetry: () => void;
};

/**
 * CoachLimitScreen — fail-closed alert for athletes whose coach exceeded the
 * athlete limit of their platform plan. Training is blocked until the coach
 * upgrades, so the athlete is asked to contact the administration.
 */
export function CoachLimitScreen({
  planName,
  maxAthletes,
  athletesCount,
  onRetry,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <AlertIcon size={36} color={colors.warning} />
        </View>
        <Text style={styles.eyebrow}>Límite de atletas alcanzado</Text>
        <Text style={styles.title}>
          Tu coach superó el límite de atletas de su plan
        </Text>
        <Text style={styles.message}>
          El plan{planName ? ` ${planName}` : ''} permite {maxAthletes}{' '}
          {maxAthletes === 1 ? 'atleta' : 'atletas'} y actualmente tiene{' '}
          {athletesCount}. Para seguir entrenando, pídele a tu coach que se
          comunique con la administración y cambie de plan.
        </Text>
        <PrimaryButton label="Volver a intentar" onPress={onRetry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base,
    padding: layout.pagePadding,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.warning}15`,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.warning,
    textAlign: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: spacing.sm,
  },
});
