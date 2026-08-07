import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../app/Navigation';

type AuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

export function SignInScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  const code = (route.params as { code?: string })?.code;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (mode === 'signin' && signInLoaded) {
      setLoading(true);
      try {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status === 'complete') {
          if (code) {
            navigation.navigate('InviteAccept', { code });
          } else {
            navigation.navigate('AthleteTabs');
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign in failed';
        Alert.alert('Error', message);
      } finally {
        setLoading(false);
      }
    } else if (mode === 'signup' && signUpLoaded) {
      setLoading(true);
      try {
        const result = await signUp.create({
          emailAddress: email.trim(),
          password,
        });
        if (result.status === 'complete') {
          if (code) {
            navigation.navigate('InviteAccept', { code });
          } else {
            navigation.navigate('AthleteTabs');
          }
        } else {
          Alert.alert('Check your email', 'We sent you a verification link');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign up failed';
        Alert.alert('Error', message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>MR Training</Text>
          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome back, Athlete' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Your training journey continues' : 'Start your fitness journey today'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#6E6E73"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor="#6E6E73"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text style={styles.switchText}>
              {mode === 'signin'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </Pressable>

          {code && (
            <Text style={styles.codeHint}>
              Your coach code {code} will be linked after sign in
            </Text>
          )}
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
  label: { fontSize: 13, fontWeight: '600', color: '#98989D', marginBottom: 6 },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  button: { backgroundColor: '#FF6B00', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  switchButton: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#FF8C3D' },
  codeHint: { fontSize: 12, color: '#6E6E73', textAlign: 'center', marginTop: 16 },
});
