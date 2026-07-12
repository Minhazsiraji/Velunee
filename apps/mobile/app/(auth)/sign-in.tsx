import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { friendlyAuthError, validateEmail } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function SignInScreen(): React.JSX.Element {
  const router = useRouter();
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(): Promise<void> {
    if (isSubmitting) return;

    const nextEmailError = validateEmail(email);
    const nextPasswordError = password ? null : 'Enter your password.';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);

    if (nextEmailError || nextPasswordError) return;

    setIsSubmitting(true);
    try {
      await signInWithEmail(email, password);
      router.replace('/(app)');
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your Velunee journey.</Text>

          <FormField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            errorText={emailError}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            returnKeyType="next"
          />

          <FormField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            errorText={passwordError}
            secureToggle
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="Your password"
            returnKeyType="done"
            onSubmitEditing={() => void handleSignIn()}
          />

          <Link href="/(auth)/forgot-password" style={styles.forgot}>
            Forgot password?
          </Link>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <PrimaryButton
            label="Sign In"
            onPress={() => void handleSignIn()}
            isLoading={isSubmitting}
            style={styles.submit}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Velunee? </Text>
            <Link href="/(auth)/sign-up" style={styles.footerLink}>
              Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
  },
  forgot: {
    marginTop: 14,
    alignSelf: 'flex-end',
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  formError: {
    marginTop: 18,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  submit: {
    marginTop: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  footerLink: {
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '700',
  },
});
