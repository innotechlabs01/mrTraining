import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { MailIcon, UserIcon, LockIcon, TagIcon, ChevronLeftIcon } from '../../../../shared/components/icons';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { showToast } from '../../../../shared/components/ui/Toast';
import {
  clearPendingOnboarding,
  getPendingOnboarding,
  savePendingOnboarding,
  type OnboardingPayload,
} from './onboardingPending';
import { getCachedCoachCode, cacheCoachCode } from './coachCodeCache';

type AuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;
type AuthRouteProp = RouteProp<RootStackParamList, 'Auth'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<AuthRouteProp>();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [coachCode, setCoachCode] = useState(route.params?.code ?? '');
  const [mode, setMode] = useState<'signin' | 'signup'>(route.params?.mode ?? 'signin');
  const [loading, setLoading] = useState(false);

  // Returning athletes do not need to retype the invite code; auto-fill from cache.
  useEffect(() => {
    let mounted = true;
    getCachedCoachCode().then((cached) => {
      if (mounted && cached && !coachCode) {
        setCoachCode(cached);
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postOnboard = async (onboarding: OnboardingPayload | null | undefined) => {
    try {
      await apiClient.post('/athlete/onboard', {
        sports: onboarding?.sports ?? [],
        modality: onboarding?.modality ?? '',
        experienceLevel: onboarding?.experienceLevel ?? '',
        goal: onboarding?.goal ?? '',
        sessionsPerWeek: onboarding?.sessionsPerWeek ?? 0,
        sessionDuration: onboarding?.sessionDuration ?? 0,
        equipment: onboarding?.equipment ?? '',
        athleteRoutineAccepted: onboarding?.athleteRoutineAccepted ?? true,
      });
    } catch (err) {
      console.error('[Auth] onboard failed:', err);
    }
  };

  const flushPendingOnboarding = async () => {
    const pending = await getPendingOnboarding();
    if (!pending) return;
    await postOnboard(pending);
    await clearPendingOnboarding();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('error', 'Error', 'Completa todos los campos');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      showToast('error', 'Error', 'Ingresa un correo electrónico válido');
      return;
    }

    if (password.length < 8) {
      showToast('error', 'Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (mode === 'signup' && confirmPassword !== password) {
      showToast('error', 'Error', 'Las contraseñas no coinciden');
      return;
    }

    if (mode === 'signup' && !coachCode.trim()) {
      showToast('error', 'Error', 'El código del coach es obligatorio');
      return;
    }

    const normalizedCode = coachCode.trim().toUpperCase();

    if (mode === 'signin') {
      if (!signInLoaded) {
        showToast('info', 'Un momento', 'Autenticación en curso...');
        return;
      }
      setLoading(true);
      try {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status === 'complete') {
          if (normalizedCode) cacheCoachCode(normalizedCode);
          await setActive({ session: result.createdSessionId });
          await flushPendingOnboarding();
          if (normalizedCode) {
            try {
              await apiClient.post('/athlete/accept-invite', { code: normalizedCode });
            } catch (err) {
              console.error('[Auth] accept-invite failed on sign-in:', err);
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión';
        showToast('error', 'No se pudo iniciar sesión', message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!signUpLoaded) {
        showToast('info', 'Un momento', 'Autenticación en curso...');
        return;
      }
      setLoading(true);
      try {
        const result = await signUp.create({
          emailAddress: email.trim(),
          password,
          unsafeMetadata: { coachCode: normalizedCode },
        });
        if (result.status === 'complete') {
          if (normalizedCode) cacheCoachCode(normalizedCode);
          await setActiveSignUp({ session: result.createdSessionId });
          const onboarding = route.params?.onboardingData;
          await postOnboard(onboarding);
          if (normalizedCode) {
            try {
              await apiClient.post('/athlete/accept-invite', { code: normalizedCode });
            } catch (err) {
              console.error('[Auth] accept-invite failed on sign-up:', err);
            }
          }
        } else {
          const onboarding = route.params?.onboardingData;
          if (onboarding) {
            savePendingOnboarding(onboarding);
          }
          showToast('success', 'Revisa tu correo', 'Te enviamos un enlace de verificación');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta';
        showToast('error', 'No se pudo crear la cuenta', message);
      } finally {
        setLoading(false);
      }
    }
  };

  const isLoaded = mode === 'signin' ? signInLoaded : signUpLoaded;
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top bar — FitBody lime title → MR primary ── */}
          <View style={styles.topBar}>
            {canGoBack ? (
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <ChevronLeftIcon size={26} color={colors.primary} />
              </Pressable>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}
            <Text style={styles.topTitle}>{mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>

          {/* ── Hero header — centered Welcome / Let's Start! ── */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{mode === 'signin' ? 'Bienvenido' : '¡Comencemos!'}</Text>
            <Text style={styles.heroSubtitle}>
              {mode === 'signin'
                ? 'Tu camino de entrenamiento continúa'
                : 'Comienza tu camino fitness hoy'}
            </Text>
          </View>

          {/* ── Form band — FitBody lavanda → MR surface ── */}
          <View style={styles.formBand}>
            {mode === 'signin' ? (
              <>
                <Text style={styles.fieldLabel}>Usuario o correo</Text>
                <View style={styles.inputWrapper}>
                  <MailIcon size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@example.com"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    accessibilityLabel="Correo electrónico"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Nombre completo</Text>
                <View style={styles.inputWrapper}>
                  <UserIcon size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre completo"
                    placeholderTextColor={colors.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    autoComplete="name"
                    accessibilityLabel="Nombre completo"
                  />
                </View>

                <Text style={styles.fieldLabel}>Correo o número de móvil</Text>
                <View style={styles.inputWrapper}>
                  <MailIcon size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@example.com"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    accessibilityLabel="Correo o número de móvil"
                  />
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <LockIcon size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Contraseña"
              />
            </View>

            {mode === 'signup' && (
              <>
                <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
                <View style={styles.inputWrapper}>
                  <LockIcon size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    placeholder="••••••••••••"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    accessibilityLabel="Confirmar contraseña"
                  />
                </View>
              </>
            )}

            {/* Coach Code — required for sign-up; optional auto-fill for returning athletes */}
            <Text style={styles.fieldLabel}>Código del coach{mode === 'signup' ? ' *' : ''}</Text>
            <View style={styles.inputWrapper}>
              <TagIcon size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="p. ej. MR-YH9R"
                placeholderTextColor={colors.textSecondary}
                value={coachCode}
                onChangeText={setCoachCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                accessibilityLabel="Código de invitación del coach"
              />
            </View>
            <Text style={styles.codeHint}>
              {mode === 'signup'
                ? 'Obligatorio: ingresa el código de tu coach para conectarte'
                : 'Opcional: se guarda en este dispositivo tras el primer inicio de sesión'}
            </Text>

            {/* Forgot Password link — right-aligned, only in sign-in mode (FitBody) */}
            {mode === 'signin' && (
              <Pressable
                onPress={() => showToast('info', 'Próximamente', 'El restablecimiento de contraseña estará disponible pronto')}
                style={styles.forgotBtn}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            )}
          </View>

          {/* ── Actions zone — dark band with primary CTA, social, switch link ── */}
          <View style={styles.actions}>
            {/* Terms — only on sign-up, mirrors FitBody purple-band footer */}
            {mode === 'signup' && (
              <Text style={styles.termsText}>
                Al continuar, aceptas los{'\n'}
                <Text style={styles.termsAccent}>Términos de uso</Text>
                <Text style={styles.termsText}> y </Text>
                <Text style={styles.termsAccent}>la Política de privacidad.</Text>
              </Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                (loading || !isLoaded) && styles.primaryBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !isLoaded}
              accessibilityLabel={mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Espera...' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            </Pressable>

            <Text style={styles.orText}>o {mode === 'signin' ? 'crear cuenta' : 'iniciar sesión'} con</Text>

            {/* Social row — FitBody G / f / fingerprint → MR surfaceRaised cards */}
            <View style={styles.socialRow}>
              <Pressable
                style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                onPress={() => showToast('info', 'Próximamente', 'Inicio de sesión con Google próximamente')}
                accessibilityLabel="Continuar con Google"
              >
                <Text style={styles.socialIcon}>G</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                onPress={() => showToast('info', 'Próximamente', 'Inicio de sesión con Facebook próximamente')}
                accessibilityLabel="Continuar con Facebook"
              >
                <Text style={[styles.socialIcon, styles.socialIconFacebook]}>f</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                onPress={() => showToast('info', 'Próximamente', 'Inicio de sesión con huella próximamente')}
                accessibilityLabel="Continuar con huella"
              >
                <Text style={styles.socialIcon}>◉</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.switchBtn}
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              hitSlop={8}
            >
              <Text style={styles.switchText}>
                {mode === 'signin' ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
                <Text style={styles.switchAccent}>{mode === 'signin' ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: colors.base },

  // Top bar — FitBody yellow title on dark → MR primary on base
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.base,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: { width: 32, height: 32 },
  topTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Hero header
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.base,
    gap: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Form band — FitBody lavanda full-bleed → MR surface
  formBand: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    paddingVertical: 0,
    height: '100%',
  },
  inputDisabled: {
    opacity: 1,
  },
  codeHint: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Actions zone — dark with MR primary CTA
  actions: {
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  termsText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  termsAccent: {
    color: colors.primary,
    fontFamily: fontFamilies.bodySemiBold,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.xs,
  },
  primaryBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.base,
    fontWeight: '700',
  },
  orText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  socialIcon: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  socialIconFacebook: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    color: colors.primary,
  },
  switchBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  switchText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  switchAccent: {
    fontFamily: fontFamilies.bodyBold,
    color: colors.primary,
    fontWeight: '700',
  },
});
