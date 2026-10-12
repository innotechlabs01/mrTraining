import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { createCartPreference, getOrder } from '../../storeService';
import { cartTotal, useCart } from '../../application/cartStore';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { CloseIcon, MinusIcon, PlusIcon } from '../../../../shared/components/icons';
import { showToast } from '../../../../shared/components/ui/Toast';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.storeScreen;

/** Wait between order-status polls while the MP webhook lands. */
const POLL_ATTEMPTS = 6;
const POLL_DELAY_MS = 2500;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Cart bottom sheet — line items with quantity steppers, grand total and a
 * single checkout CTA. Checkout creates a MercadoPago preference server-side
 * (the API validates stock and stores a pending order), opens the MP point,
 * and polls the order until the webhook marks it paid.
 */
export function CartSheet({ visible, onClose, onSuccess }: Props) {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(false);

  const total = cartTotal(items);

  const checkout = async () => {
    setPending(true);
    let preference;
    try {
      preference = await createCartPreference(
        items.map((i) => ({ productId: i.product.id, quantity: i.qty })),
      );
    } catch (err) {
      console.error('[Store] cart preference failed:', err);
      showToast('error', t.errorTitle, t.purchaseFailed);
      setPending(false);
      return;
    }

    // Open the MercadoPago checkout in an in-app browser.
    await WebBrowser.openBrowserAsync(preference.initPoint);
    await WebBrowser.dismissBrowser();

    // Poll: the webhook fulfills the order async.
    let paid = false;
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_DELAY_MS);
      try {
        const order = await getOrder(preference.orderId);
        if (order.status === 'paid') {
          paid = true;
          break;
        }
        if (order.status === 'failed') {
          break;
        }
      } catch {
        // Network hiccup during polling — keep trying.
      }
    }

    setPending(false);
    if (paid) {
      clear();
      await queryClient.invalidateQueries({ queryKey: ['athlete-store'] });
      showToast('success', t.cartCheckoutSuccessTitle, t.cartCheckoutSuccessBody);
      onSuccess();
    } else {
      // Payment not confirmed yet — keep the cart so the user can retry.
      showToast('info', t.cartPendingTitle, t.cartPendingBody);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel={t.cartTitle} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>{t.cartTitle}</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={texts.common.close}
            >
              <CloseIcon size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>{t.cartEmpty}</Text>
          ) : (
            <>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.product.id} style={styles.row}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName} numberOfLines={2}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        ${item.product.price.toFixed(2)} × {item.qty}
                      </Text>
                    </View>
                    <View style={styles.rowControls}>
                      <StepperButton
                        label={t.cartDecrease}
                        icon={<MinusIcon size={16} color={colors.text} />}
                        onPress={() => (item.qty <= 1 ? remove(item.product.id) : setQty(item.product.id, item.qty - 1))}
                      />
                      <Text style={styles.rowQty}>{item.qty}</Text>
                      <StepperButton
                        label={t.cartIncrease}
                        icon={<PlusIcon size={16} color={colors.text} />}
                        onPress={() => setQty(item.product.id, item.qty + 1)}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t.cartTotalLabel}</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>

              <PrimaryButton
                label={pending ? texts.common.loading : t.cartConfirm}
                onPress={checkout}
                disabled={pending}
              />
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function StepperButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperPressed]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.h4, color: colors.text },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0 },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowBody: { flex: 1 },
  rowName: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowQty: { ...typography.bodyStrong, color: colors.text, minWidth: 20, textAlign: 'center' },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  totalLabel: { ...typography.bodyStrong, color: colors.textSecondary },
  totalValue: { ...typography.title, color: colors.primary, fontSize: 20 },
});
