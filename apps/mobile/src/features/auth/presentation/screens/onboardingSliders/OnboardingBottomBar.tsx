import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../../../../shared/theme/tokens';
import { texts } from '../../../../../shared/i18n/texts';
import { OnboardingDots } from './OnboardingDots';

const st = texts.screens.onboardingSliders;

type Props = {
  index: number;
  count: number;
  last: boolean;
  onNext: () => void;
};

// Bottom controls — pagination dots + next/start CTA.
export function OnboardingBottomBar({ index, count, last, onNext }: Props) {
  return (
    <View style={styles.bottom}>
      {/* DOTS */}
      <OnboardingDots count={count} index={index} />

      {/* NEXT BUTTON */}
      <Pressable
        onPress={onNext}
        style={({ pressed }) => [
          styles.nextBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          last ? st.start : st.next
        }
      >
        <Text style={styles.nextText}>
          {last ? st.start : st.next}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    position: 'absolute',

    bottom: 24,

    left: 0,
    right: 0,

    alignItems: 'center',

    gap: spacing.lg,

    paddingHorizontal: spacing.xl,
  },

  nextBtn: {
    width: 200,

    height: 50,

    borderRadius: radius.full,

    backgroundColor: colors.primary,

    justifyContent: 'center',

    alignItems: 'center',
  },

  pressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  nextText: {
    fontSize: 16,

    fontWeight: '700',

    color: colors.base,
  },
});
