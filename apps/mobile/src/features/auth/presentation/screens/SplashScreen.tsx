import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, useWindowDimensions } from 'react-native';
import { brandIcon } from '../../../../shared/theme/brandAssets';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { useAuth } from '@clerk/clerk-expo';
import { colors, fontFamilies, shadows } from '../../../../shared/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const { isSignedIn } = useAuth();
  const { width } = useWindowDimensions();

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing halo behind the brand icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // Staggered bounce dots
    const b1 = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(200),
      ]),
    );
    const b2 = Animated.loop(
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(50),
      ]),
    );
    const b3 = Animated.loop(
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    );
    b1.start();
    b2.start();
    b3.start();

    // Route after a brief brand moment. Signed-in users skip straight in.
    const timer = setTimeout(() => {
      navigation.replace(isSignedIn ? 'AthleteTabs' : 'Sliders');
    }, 3500);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      b1.stop();
      b2.stop();
      b3.stop();
    };
  }, [pulseAnim, dot1, dot2, dot3, navigation, isSignedIn]);

  const haloOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });
  const haloScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const iconScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const dotTranslate = (anim: Animated.Value) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });

  return (
    <View style={styles.container}>
      {/* Deep brand background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Soft radial vignette — solid brand glow centered */}
        <View
          style={[
            styles.radialVignette,
            { width: width * 1.6, height: width * 1.6, borderRadius: width * 0.8, marginLeft: -width * 0.8, marginTop: -width * 0.8 },
          ]}
        />
      </View>

      {/* Center brand */}
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: iconScale }] }]}>
          {/* Pulsing halo */}
          <Animated.View
            style={[
              styles.halo,
              { opacity: haloOpacity, transform: [{ scale: haloScale }] },
            ]}
          />
          {/* White disc so the icon pops */}
          <View style={styles.whiteDisc}>
            <Image source={brandIcon} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>

        <Text style={styles.title}>MR TRAINING</Text>
        <View style={styles.subtitleRow}>
          <View style={styles.subtitleLine} />
          <Text style={styles.subtitle}>Rendimiento de élite</Text>
          <View style={styles.subtitleLine} />
        </View>
      </View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dotTranslate(dot1) }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dotTranslate(dot2) }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dotTranslate(dot3) }] }]} />
        </View>
        <Text style={styles.loadingText}>Preparando tu experiencia</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radialVignette: {
    position: 'absolute',
    top: '22%',
    left: '50%',
    backgroundColor: `${colors.primary}0F`,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  logoWrapper: { width: 168, height: 168, justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  halo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${colors.primary}40`,
  },
  whiteDisc: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
    shadowColor: colors.primary,
    // extra soft glow
    elevation: 10,
  },
  logo: { width: 96, height: 96 },
  title: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 5,
    textAlign: 'center',
  },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  subtitleLine: { width: 28, height: 1, backgroundColor: colors.textSecondary, opacity: 0.6 },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  dotsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  loadingText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginTop: 8,
  },
});