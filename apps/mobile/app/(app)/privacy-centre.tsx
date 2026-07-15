import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

interface PrivacySection {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  action?: { label: string; href: string };
}

const SECTIONS: PrivacySection[] = [
  {
    icon: 'bulb-outline',
    title: 'What Velunee remembers',
    body: 'Memories are stored encrypted and only used in the features you allow. You can view, edit, pause, or delete every one of them — or delete them all at once.',
    action: { label: 'Open Memory Vault', href: '/memory-vault' },
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Your conversations',
    body: 'Chat messages are encrypted before they are stored. You can rename or delete any conversation, and deleting it removes its messages.',
    action: { label: 'Manage conversations', href: '/conversations' },
  },
  {
    icon: 'wallet-outline',
    title: 'Your financial information',
    body: 'Your income, expenses, budgets, and goals are private. They are never visible to community members and are never shared unless you deliberately choose to share a specific item.',
  },
  {
    icon: 'image-outline',
    title: 'Your photos',
    body: 'Photos you share for advice are analysed privately and are not published anywhere. Nothing you upload appears in the community unless you post it yourself.',
  },
  {
    icon: 'people-outline',
    title: 'The community',
    body: 'Only what you deliberately post is visible to others. Your memories, money, chats, and photos never enter the community automatically.',
  },
  {
    icon: 'trash-outline',
    title: 'Deleting your data',
    body: 'You can delete your account from Settings at any time. This removes your conversations, memories, financial records, and profile.',
    action: { label: 'Open Settings', href: '/settings' },
  },
];

export default function PrivacyCentreScreen(): React.JSX.Element {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Privacy Centre</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={styles.explainer}>
          Plain answers about what Velunee stores, who can see it, and how to remove it. No legal
          jargon.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name={section.icon} size={20} color={colors.primaryLight} />
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardBody}>{section.body}</Text>
            {section.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(section.action!.href)}
                style={styles.cardAction}
              >
                <Text style={styles.cardActionText}>{section.action.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primaryLight} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 26,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  explainer: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardActionText: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
});
