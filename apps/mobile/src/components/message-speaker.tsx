import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';

interface MessageSpeakerProps {
  text: string;
}

export function MessageSpeaker({ text }: MessageSpeakerProps): React.JSX.Element {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Stop any in-progress speech when this bubble unmounts.
    return () => {
      void Speech.stop();
    };
  }, []);

  async function toggle(): Promise<void> {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    Speech.speak(text, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
      hitSlop={8}
      onPress={() => void toggle()}
      style={styles.button}
    >
      <Ionicons
        name={isSpeaking ? 'stop-circle-outline' : 'volume-medium-outline'}
        size={18}
        color={colors.primaryLight}
      />
      <Text style={styles.label}>{isSpeaking ? 'Stop' : 'Listen'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  label: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
