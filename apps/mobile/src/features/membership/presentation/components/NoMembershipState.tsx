import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, spacing, typography } from '../../../../shared/theme/tokens';
import { MembershipIcon } from '../../../../shared/components/icons';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';

type Props = {
  onPayPress: () => void;
};

export function NoMembershipState({ onPayPress }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MembershipIcon size={48} color={colors.textSecondary} />
        </View>
        <Text style={styles.title}>Sin membresía activa</Text>
        <Text style={styles.body}>
          Tu entrenador asignará un plan. Mientras tanto, no puedes acceder a los entrenamientos.
        </Text>
        <View style={styles.divider} />
        <PrimaryButton label="Pagar membresía" onPress={onPayPress} variant="primary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.pagePadding,
    gap: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.textSecondary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    width: '60%',
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
});
