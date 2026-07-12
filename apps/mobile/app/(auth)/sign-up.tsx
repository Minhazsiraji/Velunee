import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import {
  friendlyAuthError,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function SignUpScreen(): React.JSX.Element {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(
    null,
  );
  const [confirmationError, setConfirmationError] = useState<
    string | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignUp(): Promise<void> {
    if (isSubmitting) return;

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextConfirmationError = validatePasswordConfirmation(
      password,
      confirmation,
    );

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmationError(nextConfirmationError);
    setFormError(null);

    if (
      nextEmailError ||
      nextPasswordError ||
      nextConfirmationError
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail(email, password);
      if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        router.replace('/(app)');
      }
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmationSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{' '}
            <Text style={styles.confirmEmail}>{email.trim()}</Text>.
            Tap it to activate your account, then sign in.
          </Text>
          <PrimaryButton
            label="Go to Sign In"
            onPress={() => router.replace('/(auth)/sign-in')}
            style={styles.submit}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Save your conversations and personalize Velunee to you.
          </Text>

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
          />

          <FormField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            errorText={passwordError}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
          />

          <FormField
            label="CONFIRM PASSWORD"
            value={confirmation}
            onChangeText={setConfirmation}
            errorText={confirmationError}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Re-enter your password"
            onSubmitEditing={() => void handleSignUp()}
          />

          {formError ? (
            <Text style={styles.formError}>{formError}</Text>
          ) : null}

          <PrimaryButton
            label="Create Account"
            onPress={() => void handleSignUp()}
            isLoading={isSubmitting}
            style={styles.submit}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-in" style={styles.footerLink}>
              Sign in
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
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmBody: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  confirmEmail: {
    color: colors.text,
    fontWeight: '700',
  },
});
