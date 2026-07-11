import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

interface ChatComposerProps {
  value: string;
  canSend: boolean;
  isSending: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void;
}

export function ChatComposer({
  value,
  canSend,
  isSending,
  onChangeText,
  onSend,
}: ChatComposerProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.composer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!isSending}
          multiline
          maxLength={12_000}
          placeholder="Ask Velunee anything..."
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primaryMuted}
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{
            disabled: !canSend,
            busy: isSending,
          }}
          disabled={!canSend}
          onPress={onSend}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator
              size="small"
              color={colors.white}
            />
          ) : (
            <Ionicons
              name="arrow-up"
              size={22}
              color={colors.white}
            />
          )}
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        Velunee can make mistakes. Check important information.
      </Text>
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
  sendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.primary,
  },
  disclaimer: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.75,
  },
});
