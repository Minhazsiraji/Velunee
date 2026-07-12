import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { friendlyAuthError } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function WelcomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { signInAsGuest } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  async function handleGuestSignIn(): Promise<void> {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signInAsGuest();
      router.replace('/(app)');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.moon}>
            <Text style={styles.moonText}>V</Text>
          </View>

          <Text style={styles.brand}>Velunee</Text>

          <Text style={styles.title}>
            Your personal AI companion
          </Text>

          <Text style={styles.subtitle}>
            Ask questions, make decisions, and move forward with
            confidence.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Create Account"
            onPress={() => router.push('/(auth)/sign-up')}
          />

          <PrimaryButton
            label="Sign In"
            variant="outline"
            onPress={() => router.push('/(auth)/sign-in')}
            style={styles.secondary}
          />

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void handleGuestSignIn()}
            style={styles.guest}
          >
            <Text style={styles.guestText}>
              {isSubmitting
                ? 'Please wait…'
                : 'Continue as Guest'}
            </Text>
          </Pressable>

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Text style={styles.tagline}>Ask. Decide. Shine.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  moon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 38,
    backgroundColor: '#6F4DCC',
    shadowColor: '#9D7BFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  moonText: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
  },
  brand: {
    marginTop: 22,
    color: colors.white,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    marginTop: 20,
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
  },
  secondary: {
    marginTop: 12,
  },
  guest: {
    marginTop: 18,
    paddingVertical: 8,
  },
  guestText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 22,
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
