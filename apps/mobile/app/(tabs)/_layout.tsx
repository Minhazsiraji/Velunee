import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

const icons: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  index: 'sparkles',
  chat: 'chatbubble-ellipses',
  create: 'add-circle',
  community: 'people',
  profile: 'person-circle',
};

export default function TabLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6FB7',
        tabBarInactiveTintColor: '#8E849F',
        tabBarStyle: {
          position: 'absolute',
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: '#392B5A',
          backgroundColor: '#151025',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size + 2} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
