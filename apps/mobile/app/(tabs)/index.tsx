import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Screen } from '@/components/screen';

const moods = [
  { emoji: '😔', label: 'Low' },
  { emoji: '😕', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Great' },
  { emoji: '✨', label: 'Amazing' },
];

const quickActions = [
  {
    icon: 'chatbubble-ellipses' as const,
    label: 'Ask Velunee',
    description: 'Talk about anything',
    route: '/(tabs)/chat' as const,
  },
  {
    icon: 'camera' as const,
    label: 'Image advice',
    description: 'Share and discuss',
    route: '/(tabs)/create' as const,
  },
  {
    icon: 'calendar' as const,
    label: 'Plan my day',
    description: 'Organize priorities',
    route: '/(tabs)/create' as const,
  },
  {
    icon: 'people' as const,
    label: 'Community',
    description: 'Explore shared ideas',
    route: '/(tabs)/community' as const,
  },
];

export default function HomeScreen(): React.JSX.Element {
  return (
    <Screen>
      {/* Header */}
      <View className="mb-7 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <BrandMark />

          <View>
            <Text className="text-xl font-black text-ink">Velunee</Text>
            <Text className="text-xs font-medium text-muted">
              Ask. Decide. Shine.
            </Text>
          </View>
        </View>

        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:bg-elevated"
          accessibilityLabel="Notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#FFF9FF"
          />

          <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
        </Pressable>
      </View>

      {/* Greeting */}
      <View className="mb-5">
        <Text className="text-sm font-bold uppercase tracking-[2px] text-secondary">
          Good evening
        </Text>

        <Text className="mt-2 text-3xl font-black leading-10 text-ink">
          How are you feeling today?
        </Text>

        <Text className="mt-2 text-base leading-6 text-muted">
          Velunee is here to listen, guide and help you move forward.
        </Text>
      </View>

      {/* Mood check-in */}
      <View className="mb-7 rounded-[28px] border border-border bg-surface p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-black text-ink">
              Daily check-in
            </Text>

            <Text className="mt-1 text-sm text-muted">
              Choose the mood closest to yours
            </Text>
          </View>

          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-elevated">
            <Ionicons name="heart" size={20} color="#FF91B9" />
          </View>
        </View>

        <View className="flex-row justify-between">
          {moods.map((mood) => (
            <Pressable
              key={mood.label}
              className="items-center rounded-2xl px-2 py-2 active:bg-elevated"
            >
              <Text className="text-2xl">{mood.emoji}</Text>
              <Text className="mt-1 text-[10px] font-bold text-muted">
                {mood.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main AI companion card */}
      <View className="mb-8 overflow-hidden rounded-[30px] border border-border bg-surface p-6">
        <View className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-elevated" />
        <View className="absolute -bottom-16 -left-14 h-36 w-36 rounded-full bg-elevated" />

        <View className="mb-5 h-14 w-14 items-center justify-center rounded-[20px] bg-elevated">
          <Ionicons name="sparkles" size={27} color="#FFD18A" />
        </View>

        <Text className="text-sm font-bold uppercase tracking-[2px] text-secondary">
          Your personal AI companion
        </Text>

        <Text className="mt-3 text-3xl font-black leading-10 text-ink">
          What is on your mind?
        </Text>

        <Text className="mt-3 text-base leading-6 text-muted">
          Ask a question, talk through a decision or simply share how your
          day went.
        </Text>

        <Pressable
          className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 active:opacity-80"
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={20}
            color="#0F0B1F"
          />

          <Text className="text-base font-black text-canvas">
            Start a conversation
          </Text>

          <Ionicons name="arrow-forward" size={18} color="#0F0B1F" />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-black text-ink">Quick actions</Text>

        <Text className="text-sm font-bold text-primary">Explore</Text>
      </View>

      <View className="mb-8 flex-row flex-wrap justify-between">
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            className="mb-3 w-[48%] rounded-2xl border border-border bg-surface p-4 active:bg-elevated"
            onPress={() => router.push(action.route)}
          >
            <View className="mb-4 h-11 w-11 items-center justify-center rounded-2xl bg-elevated">
              <Ionicons name={action.icon} size={23} color="#B66CFF" />
            </View>

            <Text className="font-black text-ink">{action.label}</Text>

            <Text className="mt-1 text-xs leading-5 text-muted">
              {action.description}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Today section */}
      <Text className="mb-4 text-xl font-black text-ink">
        Today with Velunee
      </Text>

      <View className="gap-3">
        <Pressable className="flex-row items-center rounded-2xl border border-border bg-surface p-4 active:bg-elevated">
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
            <Ionicons name="partly-sunny" size={24} color="#FFD18A" />
          </View>

          <View className="flex-1">
            <Text className="font-black text-ink">Weather context</Text>

            <Text className="mt-1 text-sm leading-5 text-muted">
              Enable location later for personalized daily guidance.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#8E849D" />
        </Pressable>

        <Pressable className="flex-row items-center rounded-2xl border border-border bg-surface p-4 active:bg-elevated">
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
            <Ionicons
              name="shield-checkmark"
              size={24}
              color="#73D9A6"
            />
          </View>

          <View className="flex-1">
            <Text className="font-black text-ink">
              Private by default
            </Text>

            <Text className="mt-1 text-sm leading-5 text-muted">
              Your personal conversations are never shared automatically.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#8E849D" />
        </Pressable>
      </View>

      <View className="h-6" />
    </Screen>
  );
}
