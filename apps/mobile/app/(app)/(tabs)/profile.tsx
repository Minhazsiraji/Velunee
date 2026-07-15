import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { useAccountOverview } from '@/features/account/use-account';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { user, isAnonymous, signOutCurrentDevice } = useAuth();
  const overview = useAccountOverview();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profile = overview.data?.profile;
  const conversationCount = overview.data?.stats.conversationCount ?? 0;

  const heading =
    profile?.displayName?.trim() ||
    (isAnonymous ? 'Guest' : profile?.email) ||
    user?.email ||
    'Velunee user';

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setErrorMessage(null);
    try {
      await signOutCurrentDevice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.white} />
        </View>

        <Text style={styles.title}>{heading}</Text>

        {isAnonymous ? (
          <View style={styles.guestBanner}>
            <Text style={styles.guestText}>
              You&apos;re using a guest account. Create an account to keep your conversations safe
              across devices.
            </Text>
            <PrimaryButton
              label="Create Account"
              onPress={() => router.push('/(auth)/sign-up')}
              style={styles.guestButton}
            />
          </View>
        ) : (
          <Text style={styles.subtitle}>{profile?.email ?? user?.email ?? 'Signed in'}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            {overview.isLoading ? (
              <ActivityIndicator color={colors.primaryLight} />
            ) : (
              <Text style={styles.statValue}>{conversationCount}</Text>
            )}
            <Text style={styles.statLabel}>Conversations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {profile?.companionStyle
                ? profile.companionStyle.charAt(0).toUpperCase() + profile.companionStyle.slice(1)
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Companion style</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/memory-vault')}
          style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
        >
          <Ionicons name="bulb-outline" size={22} color={colors.text} />
          <Text style={styles.menuLabel}>Memory Vault</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/privacy-centre')}
          style={({ pressed }) => [styles.menuRowCompact, pressed && styles.menuRowPressed]}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
          <Text style={styles.menuLabel}>Privacy Centre</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/settings')}
          style={({ pressed }) => [styles.menuRowCompact, pressed && styles.menuRowPressed]}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
          <Text style={styles.menuLabel}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          label="Sign Out"
          variant="outline"
          icon="log-out-outline"
          onPress={() => void handleSignOut()}
          isLoading={isSigningOut}
          style={styles.signOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
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
    marginTop: 20,
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  guestBanner: {
    width: '100%',
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  guestText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  guestButton: {
    marginTop: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginTop: 26,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  menuRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  menuRowPressed: {
    opacity: 0.8,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    marginTop: 16,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  signOut: {
    marginTop: 26,
  },
});
