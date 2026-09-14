import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { spacing } from '../../theme/tokens';

type BentoGridProps = {
  columns?: number;
  gap?: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

type BentoItemProps = {
  span?: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Flexible bento grid layout for dashboard tiles.
 * Children wrapped in BentoItem can span multiple columns.
 */
export function BentoGrid({ columns = 2, gap = spacing.md, children, style }: BentoGridProps) {
  return (
    <View style={[styles.container, { gap }, style]}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const span = (child.props as BentoItemProps).span ?? 1;
        return (
          <View style={[styles.tile, { flexBasis: `${(span / columns) * 100}%`, flex: span / columns }]}>
            {child}
          </View>
        );
      })}
    </View>
  );
}

/** A single tile inside BentoGrid. */
export function BentoItem({ children, style }: BentoItemProps) {
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    minWidth: 0,
  },
});
