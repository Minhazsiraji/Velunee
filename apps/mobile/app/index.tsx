import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen(): React.JSX.Element {
  const { isLoading, isAuthenticated, isConfigured } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#9D7BFF" />
        <Text style={styles.loadingText}>Opening Velunee...</Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Supabase is not configured</Text>
        <Text style={styles.message}>
          Check the Supabase URL and anonymous key in the mobile environment configuration.
        </Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0B1F',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#B8B2C8',
    fontSize: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    color: '#B8B2C8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
