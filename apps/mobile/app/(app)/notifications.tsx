import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NotificationItem, NotificationPreferences } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import {
  useNotificationPreferences,
  useNotifications,
  useUpdateNotificationPreferences,
} from '@/features/notifications/use-notifications';
import { colors } from '@/theme/colors';

const CATEGORY_LABELS: Record<
  keyof Pick<NotificationPreferences, 'bills' | 'balance' | 'tasks' | 'exams'>,
  string
> = {
  bills: 'Bill reminders',
  balance: 'Spending alerts',
  tasks: 'Task reminders',
  exams: 'Exam reminders',
};

function toneIcon(tone: NotificationItem['tone']): {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
} {
  if (tone === 'warning') return { name: 'alert-circle', color: colors.danger };
  if (tone === 'positive') return { name: 'checkmark-circle', color: colors.primaryLight };
  return { name: 'information-circle', color: colors.textSecondary };
}

export default function NotificationsScreen(): React.JSX.Element {
  const router = useRouter();
  const notifications = useNotifications();
  const [prefsVisible, setPrefsVisible] = useState(false);

  const items = notifications.data?.notifications ?? [];

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
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          hitSlop={10}
          onPress={() => setPrefsVisible(true)}
          style={styles.gearButton}
        >
          <Ionicons name="options-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.data?.quietHoursActive ? (
          <View style={styles.quietBanner}>
            <Ionicons name="moon-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.quietText}>Quiet hours are on right now.</Text>
          </View>
        ) : null}

        {notifications.isLoading ? (
          <ActivityIndicator color={colors.primaryLight} style={styles.loader} />
        ) : notifications.isError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={styles.stateBody}>Couldn&apos;t load notifications.</Text>
            <PrimaryButton
              label="Retry"
              variant="outline"
              onPress={() => void notifications.refetch()}
              style={styles.retry}
            />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="notifications-outline" size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>You&apos;re all caught up</Text>
            <Text style={styles.stateBody}>
              Velunee will let you know about bills, spending, tasks and exams that need attention.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const icon = toneIcon(item.tone);
            return (
              <View key={item.id} style={styles.card}>
                <Ionicons name={icon.name} size={20} color={icon.color} style={styles.cardIcon} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PreferencesModal visible={prefsVisible} onClose={() => setPrefsVisible(false)} />
    </SafeAreaView>
  );
}

function PreferencesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const prefs = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const preferences = prefs.data?.preferences;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notification settings</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.modalHint}>Choose what Velunee tells you about.</Text>

          {preferences
            ? (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => (
                <View key={key} style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{CATEGORY_LABELS[key]}</Text>
                  <Switch
                    value={preferences[key]}
                    onValueChange={(value) => update.mutate({ [key]: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              ))
            : null}

          {preferences ? (
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>Hide details on lock screen</Text>
                <Text style={styles.settingSub}>Keep amounts and topics private</Text>
              </View>
              <Switch
                value={preferences.lockScreenPrivacy}
                onValueChange={(value) => update.mutate({ lockScreenPrivacy: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' },
  gearButton: { backgroundColor: colors.primary, borderRadius: 18, padding: 7 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  quietBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quietText: { color: colors.textSecondary, fontSize: 13 },
  loader: { marginVertical: 40 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  stateTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  stateBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retry: { marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardIcon: { marginTop: 1 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 6, 20, 0.7)' },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modalHint: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  settingTextGroup: { flex: 1, gap: 2 },
  settingLabel: { color: colors.text, fontSize: 15 },
  settingSub: { color: colors.textMuted, fontSize: 12 },
});
