import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useVoiceInput } from '@/features/voice/use-voice-input';
import { colors } from '@/theme/colors';

interface ChatComposerProps {
  value: string;
  canSend: boolean;
  isSending: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function ChatComposer({
  value,
  canSend,
  isSending,
  onChangeText,
  onSend,
  onStop,
}: ChatComposerProps): React.JSX.Element {
  const voice = useVoiceInput();

  async function handleMicPress(): Promise<void> {
    if (isSending || voice.isTranscribing) return;

    if (voice.isRecording) {
      const text = await voice.stopAndTranscribe();
      if (text) {
        onChangeText(value.trim() ? `${value.trim()} ${text}` : text);
      }
    } else {
      await voice.startRecording();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.composer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!isSending}
          multiline
          maxLength={12_000}
          placeholder={
            voice.isRecording ? 'Listening… tap stop when done' : 'Ask Velunee anything...'
          }
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primaryMuted}
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voice.isRecording ? 'Stop recording' : 'Voice input'}
          disabled={isSending || voice.isTranscribing}
          onPress={() => void handleMicPress()}
          style={({ pressed }) => [styles.micButton, pressed && styles.pressed]}
        >
          {voice.isTranscribing ? (
            <ActivityIndicator size="small" color={colors.primaryLight} />
          ) : (
            <Ionicons
              name={voice.isRecording ? 'stop-circle' : 'mic-outline'}
              size={23}
              color={voice.isRecording ? colors.danger : colors.textSecondary}
            />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSending ? 'Stop generating' : 'Send message'}
          accessibilityState={{
            disabled: !isSending && !canSend,
            busy: isSending,
          }}
          disabled={!isSending && !canSend}
          onPress={isSending ? onStop : onSend}
          style={({ pressed }) => [
            styles.sendButton,
            isSending && styles.stopButton,
            !isSending && !canSend && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={isSending ? 'stop' : 'arrow-up'}
            size={isSending ? 19 : 22}
            color={!isSending && !canSend ? colors.primaryLight : colors.white}
          />
        </Pressable>
      </View>

      {voice.error ? (
        <Text style={styles.voiceError}>{voice.error}</Text>
      ) : (
        <Text style={styles.disclaimer}>
          Velunee can make mistakes. Check important information.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
  composer: {
    minHeight: 54,
    maxHeight: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 25,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: 9,
    paddingBottom: 8,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  micButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: '#B63C5E',
  },
  disclaimer: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  voiceError: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 11,
    textAlign: 'center',
  },
  disabled: {
    opacity: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#4A356E',
  },
  pressed: {
    opacity: 0.75,
  },
});
