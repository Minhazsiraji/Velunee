import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function ProfileScreen(): React.JSX.Element {
  const {
    user,
    isAnonymous,
    signOutCurrentDevice,
  } = useAuth();

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await signOutCurrentDevice();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign out.',
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Ionicons
            name="person"
            size={40}
            color={colors.white}
          />
        </View>

        <Text style={styles.title}>
          {isAnonymous
            ? 'Guest profile'
            : 'Velunee profile'}
        </Text>

        <Text style={styles.subtitle}>
          {isAnonymous
            ? 'You are securely signed in as an anonymous guest.'
            : user?.email ?? 'Signed-in Velunee user'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            USER ID
          </Text>

          <Text
            style={styles.userId}
            numberOfLines={1}
          >
            {user?.id ?? 'Unavailable'}
          </Text>
        </View>

        {errorMessage ? (
          <Text style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: isSigningOut,
            disabled: isSigningOut,
          }}
          disabled={isSigningOut}
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            isSigningOut && styles.disabled,
          ]}
        >
          {isSigningOut ? (
            <ActivityIndicator
              color={colors.white}
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={21}
                color={colors.white}
              />

              <Text style={styles.buttonText}>
                Sign Out
              </Text>
            </>
          )}
        </Pressable>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  avatar: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 46,
    backgroundColor: colors.primary,
  },
  title: {
    marginTop: 22,
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 9,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    marginTop: 32,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  userId: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
  },
  error: {
    marginTop: 16,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  buttonText: {
    marginLeft: 9,
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
