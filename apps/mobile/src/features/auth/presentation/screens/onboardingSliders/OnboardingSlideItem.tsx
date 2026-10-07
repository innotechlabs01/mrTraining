import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, fontFamilies } from '../../../../../shared/theme/tokens';

export type OnboardingSlide = {
  key: string;
  image: number;
  title: string;
  subtitle: string;
};

type Props = {
  item: OnboardingSlide;
  width: number;
  height: number;
};

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

function getImageDimensions(image: number, width: number) {
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
}

export function OnboardingSlideItem({ item, width, height }: Props) {
  const imageDimensions = getImageDimensions(item.image, width);

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
      {/* IMAGE */}
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

      {/* OVERLAY */}
      <View
        style={styles.overlay}
        pointerEvents="none"
      />

      {/* TEXT CONTENT */}
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
}

const styles = StyleSheet.create({
  slide: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.base,
  },
  imageContainer: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    alignItems: 'center',

    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: 'rgba(11, 15, 14, 0.30)',
  },
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
});
