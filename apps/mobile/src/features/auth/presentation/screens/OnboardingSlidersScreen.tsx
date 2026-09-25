import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  colors,
  spacing,
  radius,
  fontFamilies,
} from '../../../../shared/theme/tokens';

import {
  onboardingSlides,
} from '../../../../shared/theme/brandAssets';

import type { RootStackParamList } from '../../../../navigation/Navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Sliders'>;

type Slide = {
  key: string;
  image: number;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    image: onboardingSlides.slide1,
    title: 'Entrena con propósito',
    subtitle:
      'Programas personalizados según tu deporte, tus objetivos y tu agenda.',
  },
  {
    key: '2',
    image: onboardingSlides.slide2,
    title: 'Entrena a tu nivel',
    subtitle:
      'De principiante a avanzado, tu plan evoluciona a medida que mejoras.',
  },
  {
    key: '3',
    image: onboardingSlides.slide3,
    title: 'Alcanza tu máximo',
    subtitle:
      'Registra tu progreso, construye constancia y alcanza tus metas cada semana.',
  },
];

export function OnboardingSlidersScreen({
  navigation,
}: Props) {
  const { width, height } = useWindowDimensions();

  const [index, setIndex] = useState(0);

  const listRef = useRef<FlatList<Slide>>(null);

  // ================================================================
  // IMAGE SIZE
  // ================================================================
  //
  // Cada imagen conserva su proporción original.
  // La imagen ocupa todo el ancho disponible.
  //
  // Importante:
  // Image.resolveAssetSource() funciona con imágenes locales
  // require(...) utilizadas por React Native.
  //

  const getImageDimensions = (image: number) => {
    const source = Image.resolveAssetSource(image);

    if (!source?.width || !source?.height) {
      return {
        width,
        height: width,
      };
    }

    const aspectRatio = source.width / source.height;

    return {
      width,
      height: width / aspectRatio,
    };
  };

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

      <FlatList
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
        renderItem={({ item }) => {
          const imageDimensions = getImageDimensions(item.image);

          return (
            <View
              style={[
                styles.slide,
                {
                  width,
                  height,
                },
              ]}
            >
              {/* ====================================================
                  IMAGE
              ==================================================== */}

              <View style={styles.imageContainer}>
                <Image
                  source={item.image}
                  style={{
                    width: imageDimensions.width,
                    height: imageDimensions.height,
                  }}
                  resizeMode="contain"
                />
              </View>

              {/* ====================================================
                  OVERLAY
              ==================================================== */}

              <View
                style={styles.overlay}
                pointerEvents="none"
              />

              {/* ====================================================
                  TEXT CONTENT
              ==================================================== */}

              <View style={styles.slideContent}>
                <Text style={styles.slideTitle}>
                  {item.title}
                </Text>

                <Text style={styles.slideSubtitle}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
          );
        }}
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
          accessibilityLabel="Omitir onboarding"
        >
          <Text style={styles.skipText}>
            Omitir
          </Text>
        </Pressable>
      )}

      {/* ============================================================
          BOTTOM CONTROLS
      ============================================================ */}

      <View style={styles.bottom}>
        {/* ========================================================
            DOTS
        ======================================================== */}

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index
                  ? styles.dotActive
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* ========================================================
            NEXT BUTTON
        ======================================================== */}

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.nextBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            last ? 'Comenzar' : 'Siguiente'
          }
        >
          <Text style={styles.nextText}>
            {last ? 'Comenzar' : 'Siguiente'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ==================================================================
// STYLES
// ==================================================================

const styles = StyleSheet.create({
  // ================================================================
  // CONTAINER
  // ================================================================

  container: {
    flex: 1,
    backgroundColor: colors.base,
  },

  slider: {
    flex: 1,
  },

  // ================================================================
  // SLIDE
  // ================================================================

  slide: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.base,
  },

  // ================================================================
  // IMAGE CONTAINER
  // ================================================================

  imageContainer: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    alignItems: 'center',

    overflow: 'hidden',
  },

  // ================================================================
  // OVERLAY
  // ================================================================

  overlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: 'rgba(11, 15, 14, 0.30)',
  },

  // ================================================================
  // SLIDE CONTENT
  // ================================================================

  slideContent: {
    position: 'absolute',

    left: spacing.xl,
    right: spacing.xl,

    bottom: 145,

    top: 530,

    alignItems: 'center',
  },

  slideTitle: {
    fontFamily: fontFamilies.displayBlack,

    fontSize: 32,
    lineHeight: 38,

    color: colors.text,

    textAlign: 'center',

    letterSpacing: 0.5,
  },

  slideSubtitle: {
    marginTop: spacing.sm,

    fontSize: 16,
    lineHeight: 24,

    color: colors.textSecondary,

    textAlign: 'center',

    paddingHorizontal: spacing.sm,
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

  // ================================================================
  // BOTTOM
  // ================================================================

  bottom: {
    position: 'absolute',

    bottom: 24,

    left: 0,
    right: 0,

    alignItems: 'center',

    gap: spacing.lg,

    paddingHorizontal: spacing.xl,
  },

  // ================================================================
  // DOTS
  // ================================================================

  dotsRow: {
    flexDirection: 'row',

    gap: spacing.sm,

    alignItems: 'center',
  },

  dot: {
    height: 8,

    borderRadius: 4,
  },

  dotActive: {
    width: 24,

    backgroundColor: colors.primary,
  },

  dotInactive: {
    width: 8,

    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // ================================================================
  // NEXT BUTTON
  // ================================================================

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