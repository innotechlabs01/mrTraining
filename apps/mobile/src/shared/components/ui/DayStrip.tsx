import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export type CalendarDay = {
  key: string; // 'YYYY-MM-DD'
  weekday: string;
  dayNumber: number;
  month: string;
  eventCount: number;
  isToday: boolean;
};

type Props = {
  days: CalendarDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onEndReached: () => void;
};

const CHIP_WIDTH = 60;

export function DayStrip({ days, selectedKey, onSelect, onEndReached }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: CalendarDay }) => {
      const selected = item.key === selectedKey;
      const hasEvents = item.eventCount > 0;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${item.weekday} ${item.dayNumber} ${item.month}, ${item.eventCount} eventos`}
          onPress={() => onSelect(item.key)}
          style={[styles.chip, selected && styles.chipSelected]}
        >
          <Text style={[styles.weekday, selected && styles.weekdaySelected]}>
            {item.isToday ? 'Hoy' : item.weekday}
          </Text>
          <Text style={[styles.number, selected && styles.numberSelected]}>{item.dayNumber}</Text>
          <View style={styles.eventsRow}>
            {hasEvents ? (
              <>
                <View style={[styles.dot, selected && styles.dotSelected]} />
                <Text style={[styles.count, selected && styles.countSelected]}>{item.eventCount}</Text>
              </>
            ) : (
              <Text style={styles.noEvents}>·</Text>
            )}
          </View>
        </Pressable>
      );
    },
    [selectedKey, onSelect],
  );

  return (
    <FlatList
      horizontal
      data={days}
      keyExtractor={(d) => d.key}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      initialNumToRender={12}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    width: CHIP_WIDTH,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekday: { ...typography.caption, color: colors.textSecondary },
  weekdaySelected: { color: colors.base },
  number: { ...typography.bodyStrong, fontSize: 18, color: colors.text, marginVertical: 2 },
  numberSelected: { color: colors.base },
  eventsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    minHeight: 14,
  },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 6,
    width: 6,
  },
  dotSelected: { backgroundColor: colors.base },
  count: {
    ...typography.overline,
    color: colors.primary,
    fontSize: 9,
    lineHeight: 12,
  },
  countSelected: { color: colors.base },
  noEvents: { ...typography.caption, color: colors.border },
});