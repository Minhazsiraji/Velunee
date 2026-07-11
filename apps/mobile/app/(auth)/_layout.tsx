import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function AuthLayout(): React.JSX.Element {
  const {
    isLoading,
    isAuthenticated,
  } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
