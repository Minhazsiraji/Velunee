import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen(): React.JSX.Element {
  const {
    user,
    isAnonymous,
    signOutCurrentDevice,
  } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOutCurrentDevice();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>VELUNEE</Text>

      <Text style={styles.title}>
        Guest authentication works
      </Text>

      <Text style={styles.message}>
        You are securely signed in
        {isAnonymous ? ' as an anonymous guest.' : '.'}
      </Text>

      <Text style={styles.userId} numberOfLines={1}>
        User: {user?.id ?? 'Unknown'}
      </Text>

      <Pressable
        disabled={isSigningOut}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        {isSigningOut ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Sign Out</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0B1F',
    padding: 28,
  },
  eyebrow: {
    color: '#9D7BFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 14,
    color: '#B8B2C8',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  userId: {
    width: '100%',
    marginTop: 20,
    color: '#847E94',
    fontSize: 12,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 34,
    borderRadius: 18,
    backgroundColor: '#7C5CE7',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
