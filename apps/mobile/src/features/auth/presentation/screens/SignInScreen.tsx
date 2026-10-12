import React, { useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors } from '../../../../shared/theme/tokens';
import { SignInTopBar } from './signin/SignInTopBar';
import { SignInHero } from './signin/SignInHero';
import { SignInFormSection } from './signin/SignInFormSection';
import { SignInActions } from './signin/SignInActions';
import { ResetPasswordSection } from './signin/ResetPasswordSection';
import { useSignInForm } from './signin/useSignInForm';
import { usePasswordReset } from './signin/usePasswordReset';

type AuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;
type AuthRouteProp = RouteProp<RootStackParamList, 'Auth'>;

export function SignInScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<AuthRouteProp>();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const form = useSignInForm({
    initialCode: route.params?.code,
    initialMode: route.params?.mode,
    getOnboardingData: () => route.params?.onboardingData,
  });
  const reset = usePasswordReset();
  const canGoBack = navigation.canGoBack();

  // Session already active (e.g. Clerk hydrated late, or reset flow completed):
  // never keep a signed-in athlete on the login screen.
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigation.replace('AthleteTabs');
    }
  }, [authLoaded, isSignedIn, navigation]);

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
          <SignInTopBar
            mode={form.mode}
            canGoBack={canGoBack}
            onBack={() => navigation.goBack()}
          />
          {reset.stage === 'code_sent' ? (
            <ResetPasswordSection
              email={form.email}
              code={reset.code}
              newPassword={reset.newPassword}
              loading={reset.loading}
              onCodeChange={reset.setCode}
              onNewPasswordChange={reset.setNewPassword}
              onConfirm={reset.confirm}
              onCancel={reset.cancel}
              onResend={() => reset.sendCode(form.email)}
            />
          ) : (
            <>
              <SignInHero mode={form.mode} />
              <SignInFormSection
                mode={form.mode}
                email={form.email}
                fullName={form.fullName}
                password={form.password}
                confirmPassword={form.confirmPassword}
                coachCode={form.coachCode}
                onEmailChange={form.setEmail}
                onFullNameChange={form.setFullName}
                onPasswordChange={form.setPassword}
                onConfirmPasswordChange={form.setConfirmPassword}
                onCoachCodeChange={form.setCoachCode}
                onForgotPassword={reset.sendCode}
              />
              <SignInActions
                mode={form.mode}
                loading={form.loading}
                isLoaded={form.isLoaded}
                onSubmit={form.handleSubmit}
                onToggleMode={form.toggleMode}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: colors.base },
});
