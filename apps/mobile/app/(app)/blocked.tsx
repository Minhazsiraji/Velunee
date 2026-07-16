import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BlockedUser } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { useBlockedUsers, useUnblockUser } from '@/features/community/use-community';
import { colors } from '@/theme/colors';

export default function BlockedScreen(): React.JSX.Element {
  const router = useRouter();
  const blocked = useBlockedUsers();
  const users = blocked.data?.users ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Blocked accounts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.explainer}>
          Blocked people can&apos;t see your posts, and you won&apos;t see theirs. Unblock anyone
          here at any time.
        </Text>

        {blocked.isLoading ? (
          <ActivityIndicator color={colors.primaryLight} style={styles.loader} />
        ) : blocked.isError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={styles.stateBody}>Couldn&apos;t load your blocked list.</Text>
            <PrimaryButton
              label="Retry"
              variant="outline"
              onPress={() => void blocked.refetch()}
              style={styles.retry}
            />
          </View>
        ) : users.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="shield-checkmark-outline" size={44} color={colors.textMuted} />
            <Text style={styles.stateBody}>You haven&apos;t blocked anyone.</Text>
          </View>
        ) : (
          users.map((user) => <BlockedRow key={user.userId} user={user} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BlockedRow({ user }: { user: BlockedUser }): React.JSX.Element {
  const unblock = useUnblockUser();

  function confirmUnblock(): void {
    Alert.alert('Unblock', `Unblock ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: () => unblock.mutate(user.userId) },
    ]);
  }

  return (
    <View style={styles.row}>
      <Text style={styles.name} numberOfLines={1}>
        {user.name}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unblock ${user.name}`}
        onPress={confirmUnblock}
        style={styles.unblockButton}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' },
  headerSpacer: { width: 26 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  explainer: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  loader: { marginVertical: 40 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  stateBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retry: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  unblockButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockText: { color: colors.primaryLight, fontSize: 13, fontWeight: '700' },
});
