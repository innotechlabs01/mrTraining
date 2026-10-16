import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '../../../../shared/theme/tokens';

export function MembershipSkeleton() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={[styles.headerSkeleton, { width: '100%' }]} />
        <View style={[styles.headerSkeleton, { width: '60%' }]} />
        <View style={styles.divider} />
        <View style={styles.cardSkeleton} />
        <View style={styles.cardSkeleton} />
        <View style={styles.cardSkeleton} />
        <View style={styles.buttonSkeleton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, gap: spacing.md },
  headerSkeleton: {
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.skeletonBase,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardSkeleton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.skeletonBase,
  },
  buttonSkeleton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.skeletonBase,
  },
});
