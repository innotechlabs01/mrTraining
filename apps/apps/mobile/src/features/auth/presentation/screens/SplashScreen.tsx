import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';

type Props = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const skipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(skipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    const timer = setTimeout(onFinish, 4000);
    return () => { clearTimeout(timer); pulse.stop(); };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgGlow} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.iconText}>🏋️</Text>
        </Animated.View>

        <Text style={styles.brandText}>MR TRAINING</Text>

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your performance operating system
        </Animated.Text>

        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoText}>📽️</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { value: '15K+', label: 'Athletes' },
            { value: '500+', label: 'Coaches' },
            { value: '20+', label: 'Sports' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.skipWrap, { opacity: skipOpacity }]}>
        <Pressable onPress={onFinish} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  bgGlow: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#FF8C3D15',
  },
  content: { alignItems: 'center', paddingHorizontal: 40 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FF8C3D15', borderWidth: 2, borderColor: '#FF8C3D30',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  iconText: { fontSize: 44 },
  brandText: {
    fontSize: 32, fontWeight: '900', color: '#F5F5F7',
    letterSpacing: 4, marginBottom: 8,
  },
  tagline: { fontSize: 15, color: '#98989D', letterSpacing: 1, marginBottom: 32 },
  videoPlaceholder: {
    width: '100%', height: 160, borderRadius: 16,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#38383A',
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  videoText: { fontSize: 48 },
  statsRow: { flexDirection: 'row', gap: 32 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FF8C3D' },
  statLabel: { fontSize: 11, color: '#98989D', marginTop: 2 },
  skipWrap: { position: 'absolute', top: 60, right: 24 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#38383A' },
  skipText: { fontSize: 13, color: '#98989D', fontWeight: '600' },
});
