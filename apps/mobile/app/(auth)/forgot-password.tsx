import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { friendlyAuthError, validateEmail } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(): Promise<void> {
    if (isSubmitting) return;

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setFormError(null);
    if (nextEmailError) return;

    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmTitle}>Reset link sent</Text>
          <Text style={styles.confirmBody}>
            If an account exists for {email.trim()}, a password reset link is on its way. Follow it
            to choose a new password.
          </Text>
          <PrimaryButton
            label="Back to Sign In"
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter the email linked to your account and we&apos;ll send a reset link.
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
            onSubmitEditing={() => void handleReset()}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <PrimaryButton
            label="Send Reset Link"
            onPress={() => void handleReset()}
            isLoading={isSubmitting}
            style={styles.submit}
          />

          <PrimaryButton
            label="Back"
            variant="outline"
            onPress={() => router.back()}
            style={styles.back}
          />
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
  back: {
    marginTop: 14,
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
});
