import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { OptionPicker } from '@/components/option-picker';
import { PrimaryButton } from '@/components/primary-button';
import { ToggleRow } from '@/components/setting-row';
import { deleteAccount } from '@/features/account/api';
import {
  useAccountOverview,
  useUpdatePreferences,
  useUpdateProfile,
} from '@/features/account/use-account';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

const COMPANION_STYLES = [
  { value: 'warm', label: 'Warm' },
  { value: 'concise', label: 'Concise' },
  { value: 'playful', label: 'Playful' },
  { value: 'professional', label: 'Professional' },
] as const;

const ANSWER_LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
] as const;

export default function SettingsScreen(): React.JSX.Element {
  const router = useRouter();
  const { signOutEverywhere } = useAuth();

  const overview = useAccountOverview();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();

  const [displayName, setDisplayName] = useState('');
  const [companionStyle, setCompanionStyle] =
    useState<(typeof COMPANION_STYLES)[number]['value']>('warm');
  const [profileSaved, setProfileSaved] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const profile = overview.data?.profile;
  const preferences = overview.data?.preferences;

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
      setCompanionStyle(profile.companionStyle);
    }
  }, [profile]);

  async function handleSaveProfile(): Promise<void> {
    setProfileSaved(false);
    await updateProfile
      .mutateAsync({
        displayName: displayName.trim() || null,
        companionStyle,
      })
      .then(() => setProfileSaved(true))
      .catch(() => undefined);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await signOutEverywhere();
      setDeleteModalVisible(false);
      router.replace('/(auth)/welcome');
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Unable to delete your account. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (overview.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  if (overview.isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn&apos;t load settings</Text>
          <Text style={styles.errorBody}>Check your connection and try again.</Text>
          <PrimaryButton
            label="Retry"
            variant="outline"
            onPress={() => void overview.refetch()}
            style={styles.retry}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <FormField
            label="DISPLAY NAME"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setProfileSaved(false);
            }}
            placeholder="What should Velunee call you?"
            autoCapitalize="words"
            maxLength={120}
          />

          <View style={styles.pickerSpacing}>
            <OptionPicker
              label="COMPANION STYLE"
              options={[...COMPANION_STYLES]}
              value={companionStyle}
              onChange={(value) => {
                setCompanionStyle(value);
                setProfileSaved(false);
              }}
            />
          </View>

          {updateProfile.isError ? (
            <Text style={styles.inlineError}>Couldn&apos;t save your profile. Try again.</Text>
          ) : null}

          {profileSaved ? <Text style={styles.inlineSuccess}>Saved.</Text> : null}

          <PrimaryButton
            label="Save Profile"
            onPress={() => void handleSaveProfile()}
            isLoading={updateProfile.isPending}
            style={styles.saveButton}
          />
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          {preferences ? (
            <>
              <OptionPicker
                label="ANSWER LENGTH"
                options={[...ANSWER_LENGTHS]}
                value={preferences.answerLength}
                onChange={(value) => updatePreferences.mutate({ answerLength: value })}
                disabled={updatePreferences.isPending}
              />

              <View style={styles.divider} />

              <ToggleRow
                label="Voice replies"
                description="Let Velunee speak responses aloud."
                value={preferences.voiceEnabled}
                onValueChange={(value) => updatePreferences.mutate({ voiceEnabled: value })}
              />
              <ToggleRow
                label="Personal memory"
                description="Remember helpful details across chats."
                value={preferences.memoryEnabled}
                onValueChange={(value) => updatePreferences.mutate({ memoryEnabled: value })}
              />
              <ToggleRow
                label="Usage analytics"
                description="Share anonymous usage to improve Velunee."
                value={preferences.analyticsEnabled}
                onValueChange={(value) =>
                  updatePreferences.mutate({
                    analyticsEnabled: value,
                  })
                }
              />
            </>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDeleteModalVisible(true)}
            style={styles.dangerRow}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <View style={styles.dangerText}>
              <Text style={styles.dangerLabel}>Delete account</Text>
              <Text style={styles.dangerDescription}>
                Permanently remove your account and all your data.
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your profile, conversations, memories, and community
              activity. This cannot be undone.
            </Text>
            <Text style={styles.modalPrompt}>Type DELETE to confirm.</Text>

            <FormField
              label=""
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              errorText={deleteError}
              autoCapitalize="characters"
              placeholder="DELETE"
            />

            <PrimaryButton
              label="Delete Forever"
              variant="danger"
              onPress={() => void handleConfirmDelete()}
              isLoading={isDeleting}
              style={styles.modalDelete}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => {
                setDeleteModalVisible(false);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
              disabled={isDeleting}
              style={styles.modalCancel}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 26,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 18,
  },
  pickerSpacing: {
    marginTop: 18,
  },
  saveButton: {
    marginTop: 20,
  },
  inlineError: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 13,
  },
  inlineSuccess: {
    marginTop: 14,
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 6,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerText: {
    flex: 1,
    marginLeft: 12,
  },
  dangerLabel: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  dangerDescription: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBody: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  retry: {
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 14, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  modalBody: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  modalPrompt: {
    marginTop: 16,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalDelete: {
    marginTop: 20,
  },
  modalCancel: {
    marginTop: 12,
  },
});
