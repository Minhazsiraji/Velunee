import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/providers/auth-provider';

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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to continue as guest.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
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

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void handleGuestSignIn()}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isSubmitting && styles.buttonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Continue as Guest
          </Text>
        )}
      </Pressable>

      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      <Text style={styles.tagline}>Ask. Decide. Shine.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0F0B1F',
    paddingHorizontal: 28,
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
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  brand: {
    marginTop: 22,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: '#B8B2C8',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    borderRadius: 18,
    backgroundColor: '#7C5CE7',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  error: {
    marginTop: 14,
    color: '#FF8A9A',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 28,
    color: '#9D7BFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
