import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';

export function SignInScreen() {
  const { signIn, isLoaded } = useSignIn();

  const handleSignIn = async () => {
    if (!isLoaded) return;
    try {
      await signIn.create({
        identifier: 'athlete@mrtraining.app',
        password: 'Pass4Testing!',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      Alert.alert('Error', message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>MR Training</Text>
          <Text style={styles.title}>Welcome back, Athlete</Text>
          <Text style={styles.subtitle}>Your training journey continues</Text>
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSignIn}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
          <Text style={styles.hint}>
            Use your MR Training account to access your workouts, nutrition plans, and recovery data.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  brand: { fontSize: 12, color: '#FF8C3D', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 },
  title: { fontSize: 28, lineHeight: 34, color: '#F5F5F7', textAlign: 'center', fontWeight: '700' },
  subtitle: { fontSize: 17, color: '#98989D', textAlign: 'center', marginTop: 8 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#38383A' },
  button: { backgroundColor: '#FF6B00', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  hint: { fontSize: 13, color: '#6E6E73', textAlign: 'center', lineHeight: 20 },
});
