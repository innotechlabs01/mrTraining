import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cartCount, cartTotal, useCart } from '../../application/cartStore';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { StoreIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.storeScreen;

/**
 * Floating cart summary bar. Anchored above the tab bar whenever the cart
 * has articles; tapping it opens the cart sheet. Fitts-friendly: full-width
 * touch target.
 */
export function CartBar({ onPress }: { onPress: () => void }) {
  const items = useCart((s) => s.items);
  const count = cartCount(items);
  if (count === 0) return null;
  const total = cartTotal(items);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${count} ${t.cartItemsInCart}, ${t.cartTotalLabel} $${total.toFixed(2)}`}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <StoreIcon size={18} color={colors.primary} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          </View>
          <Text style={styles.countText} numberOfLines={1}>
            {count} {t.cartItemsInCart}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.totalText}>${total.toFixed(2)}</Text>
          <Text style={styles.payText}>{t.cartPay}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  barPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconWrap: { position: 'relative', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.base },
  countText: { ...typography.bodySmall, color: colors.textSecondary },
  right: { alignItems: 'flex-end' },
  totalText: { ...typography.bodyStrong, color: colors.text },
  payText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
