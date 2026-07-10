import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BrandMark } from '@/components/brand-mark';
import { Screen } from '@/components/screen';

const quickActions = [
  { icon: 'chatbubble-ellipses' as const, label: 'Ask anything', route: '/(tabs)/chat' as const },
  { icon: 'camera' as const, label: 'Image advice', route: '/(tabs)/create' as const },
  { icon: 'calendar' as const, label: 'Plan my day', route: '/(tabs)/create' as const },
];

export default function HomeScreen(): React.JSX.Element {
  return (
    <Screen>
      <View className="mb-8 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <BrandMark />
          <View>
            <Text className="text-lg font-black text-ink">Velunee</Text>
            <Text className="text-xs text-muted">Ask. Decide. Shine.</Text>
          </View>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface">
          <Ionicons name="notifications-outline" size={22} color="#FFF9FF" />
        </View>
      </View>

      <View className="mb-7 overflow-hidden rounded-[28px] border border-border bg-surface p-6">
        <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
          <Ionicons name="sparkles" size={25} color="#FFD18A" />
        </View>
        <Text className="text-sm font-bold uppercase tracking-[2px] text-secondary">Good evening</Text>
        <Text className="mt-2 text-3xl font-black leading-10 text-ink">What can I help you decide today?</Text>
        <Text className="mt-3 text-base leading-6 text-muted">
          Talk naturally, get practical guidance, and keep everything organized in one companion.
        </Text>
        <Pressable
          className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 active:opacity-80"
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#0F0B1F" />
          <Text className="text-base font-black text-canvas">Start a conversation</Text>
        </Pressable>
      </View>

      <Text className="mb-4 text-xl font-black text-ink">Quick actions</Text>
      <View className="mb-7 flex-row gap-3">
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            className="flex-1 items-center rounded-2xl border border-border bg-surface px-2 py-4 active:bg-elevated"
            onPress={() => router.push(action.route)}
          >
            <Ionicons name={action.icon} size={24} color="#B66CFF" />
            <Text className="mt-2 text-center text-xs font-bold text-ink">{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-4 text-xl font-black text-ink">Today with Velunee</Text>
      <View className="gap-3">
        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
          <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-elevated">
            <Ionicons name="partly-sunny" size={23} color="#FFD18A" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-ink">Weather context</Text>
            <Text className="mt-1 text-sm text-muted">Enable location later for a local summary.</Text>
          </View>
        </View>
        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
          <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-elevated">
            <Ionicons name="shield-checkmark" size={23} color="#73D9A6" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-ink">Private by default</Text>
            <Text className="mt-1 text-sm text-muted">Your chat is never posted to the community automatically.</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
