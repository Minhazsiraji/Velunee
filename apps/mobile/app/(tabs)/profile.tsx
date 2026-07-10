import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';

const groups = [
  {
    title: 'Personalize',
    items: [
      ['sparkles', 'Companion style'],
      ['language', 'Language and region'],
      ['volume-high', 'Voice preferences'],
    ] as const,
  },
  {
    title: 'Your data',
    items: [
      ['brain', 'Memory center'],
      ['shield-checkmark', 'Privacy controls'],
      ['key', 'Security and sessions'],
    ] as const,
  },
  {
    title: 'Account',
    items: [
      ['diamond', 'Plan and usage'],
      ['help-circle', 'Help and feedback'],
    ] as const,
  },
];

export default function ProfileScreen(): React.JSX.Element {
  return (
    <Screen>
      <SectionTitle eyebrow="Profile" title="Make Velunee yours" />
      <View className="mb-7 flex-row items-center rounded-3xl border border-border bg-surface p-5">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-elevated">
          <Ionicons name="person" size={31} color="#B66CFF" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-xl font-black text-ink">Development profile</Text>
          <Text className="mt-1 text-sm text-muted">Connect Supabase Auth to enable real accounts.</Text>
        </View>
      </View>

      {groups.map((group) => (
        <View key={group.title} className="mb-6">
          <Text className="mb-3 text-sm font-bold uppercase tracking-[1.5px] text-muted">
            {group.title}
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border bg-surface">
            {group.items.map(([icon, label], index) => (
              <Pressable
                key={label}
                className={`flex-row items-center px-5 py-4 active:bg-elevated ${
                  index < group.items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <Ionicons name={icon} size={22} color="#FF6FB7" />
                <Text className="ml-4 flex-1 text-base font-semibold text-ink">{label}</Text>
                <Ionicons name="chevron-forward" size={19} color="#8E849F" />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
