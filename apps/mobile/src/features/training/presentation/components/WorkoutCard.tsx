import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, typography, fontFamilies } from '../../../../shared/theme/tokens';
import {
  StarIcon,
  DumbbellIcon,
  RunningIcon,
  HeartPulseIcon,
  YogaIcon,
  FireIcon,
  type IconProps,
} from '../../../../shared/components/icons';

export type WorkoutItem = {
  id: string;
  contentName: string;
  modality: string;
  status: string;
  progress: number;
  startDate: string;
};

const MODALITY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  strength: DumbbellIcon,
  flexibility: YogaIcon,
  cardio: RunningIcon,
  conditioning: FireIcon,
  recovery: HeartPulseIcon,
};

export const WorkoutCard = React.memo(function WorkoutCard({
  item,
  onPress,
}: {
  item: WorkoutItem;
  onPress: (id: string) => void;
}) {
  const ModalityIcon = MODALITY_ICONS[item.modality?.toLowerCase()] ?? DumbbellIcon;
  const progressPct = Math.round((item.progress ?? 0) * 100);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.contentName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.modality}</Text>
          <Text style={styles.metaDot}>{'·'}</Text>
          <Text style={styles.metaText}>{item.status}</Text>
          {progressPct > 0 && (
            <>
              <Text style={styles.metaDot}>{'·'}</Text>
              <Text style={styles.metaText}>{progressPct}%</Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.imageWrap}>
        <ModalityIcon size={28} color={colors.textSecondary} />
        <View style={styles.starBadge}>
          <StarIcon size={10} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 84,
  },
  cardLeft: { flex: 1, padding: spacing.md, gap: 6 },
  cardTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontFamily: fontFamilies.bodyMedium, fontSize: 11, color: colors.textSecondary },
  metaDot: { fontSize: 11, color: colors.textSecondary },
  imageWrap: {
    width: 90,
    height: 90,
    margin: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  imageEmoji: { fontSize: 28 },
  starBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { color: colors.primary, fontSize: 10, lineHeight: 12 },
});
