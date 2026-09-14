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
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { onboardingSlides } from '../../../../shared/theme/brandAssets';
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
    subtitle: 'Programas personalizados según tu deporte, tus objetivos y tu agenda.',
  },
  {
    key: '2',
    image: onboardingSlides.slide2,
    title: 'Entrena a tu nivel',
    subtitle: 'De principiante a avanzado, tu plan evoluciona a medida que mejoras.',
  },
  {
    key: '3',
    image: onboardingSlides.slide3,
    title: 'Alcanza tu máximo',
    subtitle: 'Registra tu progreso, construye constancia y alcanza tus metas cada semana.',
  },
];

export function OnboardingSlidersScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    } else {
      navigation.replace('Welcome');
    }
  };

  const last = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.overlay} pointerEvents="none" />
            <View style={styles.slideContent}>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Skip (top-right) */}
      {index < SLIDES.length - 1 && (
        <Pressable style={styles.skipBtn} onPress={() => navigation.replace('Welcome')} hitSlop={8}>
          <Text style={styles.skipText}>Omitir</Text>
        </Pressable>
      )}

      {/* Bottom controls */}
      <View style={styles.bottom}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Comenzar' : 'Siguiente'}
        >
          <Text style={styles.nextText}>{last ? 'Comenzar' : 'Siguiente'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  slide: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,15,14,0.55)',
  },
  slideContent: {
    position: 'absolute',
    bottom: 140,
    left: spacing.xl,
    right: spacing.xl,
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
  skipBtn: { position: 'absolute', top: 8, right: spacing.lg },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  bottom: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  dotsRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: 'rgba(255,255,255,0.4)' },
  nextBtn: {
    width: 200,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  nextText: { fontSize: 16, fontWeight: '700', color: colors.base },
});