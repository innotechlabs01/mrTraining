import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listStore, type StoreProduct } from '../../storeService';
import { useCart } from '../../application/cartStore';
import { colors, layout, radius, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { CartBar } from '../components/CartBar';
import { CartSheet } from '../components/CartSheet';
import { StoreIcon, PlusIcon, MinusIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.storeScreen;

/** Stock level that reads as "almost gone" in the UI. */
const LOW_STOCK_THRESHOLD = 5;

export function StoreScreen() {
  const navigation = useNavigation();
  const [cartOpen, setCartOpen] = useState(false);
  const cartItems = useCart((s) => s.items);
  const hasCart = cartItems.length > 0;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['athlete-store'],
    queryFn: listStore,
    staleTime: 2 * 60 * 1000,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const products = data ?? [];
  const isEmpty = !isLoading && !isError && products.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // Clear the floating cart bar when present.
          hasCart && styles.contentWithCart,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

        {isLoading ? (
          <Skeleton.List rows={4} height={200} />
        ) : isError ? (
          <EmptyState
            variant="error"
            title={t.errorTitle}
            message={t.errorMessage}
            actionLabel={texts.common.retry}
            onAction={() => refetch()}
          />
        ) : isEmpty ? (
          <EmptyState variant="empty" title={t.emptyTitle} message={t.emptyMessage} />
        ) : (
          <View style={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </View>
        )}
      </ScrollView>

      <CartBar onPress={() => setCartOpen(true)} />
      <CartSheet
        visible={cartOpen}
        onClose={() => setCartOpen(false)}
        onSuccess={() => setCartOpen(false)}
      />
    </SafeAreaView>
  );
}

function ProductCard({ product }: { product: StoreProduct }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const inCart = items.find((i) => i.product.id === product.id)?.qty ?? 0;
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= LOW_STOCK_THRESHOLD;

  return (
    <View style={styles.card}>
      <View style={styles.imageArea}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityLabel={product.name}
          />
        ) : (
          <StoreIcon size={40} color={colors.textSecondary} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2} accessibilityRole="header">
          {product.name}
        </Text>
        {!!product.brand && (
          <Text style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>${Number(product.price).toFixed(2)}</Text>
          <Text
            style={[styles.stockText, lowStock && styles.stockLow, outOfStock && styles.stockOut]}
          >
            {outOfStock ? t.outOfStock : `${stock}`}
          </Text>
        </View>

        {inCart > 0 ? (
          // Item already in cart: inline stepper with live quantity — per-card
          // feedback, never a global pending state.
          <View style={styles.stepperRow}>
            <StepButton
              label={t.cartDecrease}
              icon={<MinusIcon size={16} color={colors.text} />}
              onPress={() => setQty(product.id, inCart - 1)}
            />
            <Text style={styles.stepperQty} accessibilityLabel={`${inCart} ${t.cartItemsInCart}`}>
              {inCart}
            </Text>
            <StepButton
              label={t.cartIncrease}
              icon={<PlusIcon size={16} color={colors.text} />}
              onPress={() => add(product)}
              disabled={inCart >= stock}
            />
          </View>
        ) : (
          <PrimaryButton
            label={outOfStock ? t.outOfStock : t.addToCart}
            icon={outOfStock ? undefined : <PlusIcon size={16} color={colors.base} />}
            onPress={() => add(product)}
            disabled={outOfStock}
          />
        )}
      </View>
    </View>
  );
}

function StepButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.stepBtn,
        pressed && styles.stepPressed,
        disabled && styles.stepDisabled,
      ]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, paddingBottom: 40, gap: spacing.md },
  contentWithCart: { paddingBottom: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: layout.heroPadding,
    ...shadows.xl,
    variant: 'premium',
    overflow: 'hidden',
  },
  imageArea: {
    height: 120,
    backgroundColor: colors.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  cardBody: { padding: spacing.md, gap: 4 },
  productName: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 18 },
  brandText: { ...typography.caption, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  priceText: { ...typography.title, color: colors.primary, fontSize: 16 },
  stockText: { ...typography.caption, color: colors.textSecondary },
  stockLow: { color: colors.warning, fontWeight: '700' },
  stockOut: { color: colors.error, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  stepperQty: { ...typography.bodyStrong, color: colors.text, minWidth: 24, textAlign: 'center' },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  stepDisabled: { opacity: 0.4 },
});
