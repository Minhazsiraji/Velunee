import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<string, IconName> = {
  chat: 'chatbubble-ellipses',
  community: 'people',
  profile: 'person-circle',
};

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      initialRouteName="chat"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 58 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          borderTopWidth: 1,
          borderTopColor: colors.borderSoft,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={tabIcons[route.name] ?? 'ellipse'}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat' }}
      />

      <Tabs.Screen
        name="community"
        options={{ title: 'Community' }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}
