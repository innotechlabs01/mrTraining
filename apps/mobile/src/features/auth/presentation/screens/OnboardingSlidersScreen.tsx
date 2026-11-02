import React, { useRef, useState } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  colors,
  spacing,
} from '../../../../shared/theme/tokens';

import {
  onboardingSlides,
} from '../../../../shared/theme/brandAssets';

import { texts } from '../../../../shared/i18n/texts';
import { OnboardingSlideItem, type OnboardingSlide } from './onboardingSliders/OnboardingSlideItem';
import { OnboardingBottomBar } from './onboardingSliders/OnboardingBottomBar';

import type { RootStackParamList } from '../../../../navigation/Navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Sliders'>;

const st = texts.screens.onboardingSliders;

const SLIDES: OnboardingSlide[] = [
  {
    key: '1',
    image: onboardingSlides.slide1,
    title: st.slide1Title,
    subtitle: st.slide1Subtitle,
  },
  {
    key: '2',
    image: onboardingSlides.slide2,
    title: st.slide2Title,
    subtitle: st.slide2Subtitle,
  },
  {
    key: '3',
    image: onboardingSlides.slide3,
    title: st.slide3Title,
    subtitle: st.slide3Subtitle,
  },
];

export function OnboardingSlidersScreen({
  navigation,
}: Props) {
  const { width, height } = useWindowDimensions();

  const [index, setIndex] = useState(0);

  const listRef = useRef<FlashListRef<OnboardingSlide>>(null);

  // ================================================================
  // CHANGE SLIDE
  // ================================================================

  const onMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    const currentIndex = Math.round(offsetX / width);

    const safeIndex = Math.max(
      0,
      Math.min(SLIDES.length - 1, currentIndex),
    );

    setIndex(safeIndex);
  };

  // ================================================================
  // NEXT
  // ================================================================

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      const nextIndex = index + 1;

      setIndex(nextIndex);

      listRef.current?.scrollToOffset({
        offset: nextIndex * width,
        animated: true,
      });

      return;
    }

    navigation.replace('Welcome');
  };

  // ================================================================
  // SKIP
  // ================================================================

  const skipOnboarding = () => {
    navigation.replace('Welcome');
  };

  const last = index === SLIDES.length - 1;

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >
      <StatusBar style="light" />

      {/* ============================================================
          SLIDES
      ============================================================ */}

      <FlashList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.slider}
        renderItem={({ item }) => (
          <OnboardingSlideItem item={item} width={width} height={height} />
        )}
      />

      {/* ============================================================
          SKIP
      ============================================================ */}

      {!last && (
        <Pressable
          style={styles.skipBtn}
          onPress={skipOnboarding}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={st.skipA11y}
        >
          <Text style={styles.skipText}>
            {st.skip}
          </Text>
        </Pressable>
      )}

      {/* ============================================================
          BOTTOM CONTROLS
      ============================================================ */}

      <OnboardingBottomBar
        index={index}
        count={SLIDES.length}
        last={last}
        onNext={goNext}
      />
    </SafeAreaView>
  );
}

// ==================================================================
// STYLES
// ==================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },

  slider: {
    flex: 1,
  },

  // ================================================================
  // SKIP
  // ================================================================

  skipBtn: {
    position: 'absolute',

    top: 16,
    right: spacing.lg,

    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },

  skipText: {
    fontSize: 15,

    fontWeight: '600',

    color: colors.textSecondary,

    letterSpacing: 0.5,
  },

});
