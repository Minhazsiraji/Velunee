import { Ionicons } from '@expo/vector-icons';
import type { ConversationListItem } from '@velunee/contracts';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

type Mode = 'menu' | 'rename' | 'delete';

interface ConversationManagementModalProps {
  conversation: ConversationListItem | null;
  isBusy: boolean;
  onClose(): void;
  onRename(title: string): Promise<void>;
  onDelete(): Promise<void>;
}

export function ConversationManagementModal({
  conversation,
  isBusy,
  onClose,
  onRename,
  onDelete,
}: ConversationManagementModalProps): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('menu');
  const [title, setTitle] = useState('');

  useEffect(() => {
    setMode('menu');
    setTitle(conversation?.title ?? '');
  }, [conversation]);

  const trimmedTitle = title.trim();

  const close = (): void => {
    if (!isBusy) onClose();
  };

  return (
    <Modal transparent visible={conversation !== null} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close conversation menu"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.dialog}>
          {mode === 'menu' ? (
            <>
              <View style={styles.dialogHeader}>
                <View style={styles.headingContent}>
                  <Text style={styles.dialogTitle}>Manage conversation</Text>

                  <Text numberOfLines={1} style={styles.currentTitle}>
                    {conversation?.title}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  disabled={isBusy}
                  onPress={close}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={21} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setMode('rename')}
                style={({ pressed }) => [styles.menuOption, pressed && styles.pressed]}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="pencil-outline" size={21} color={colors.primaryLight} />
                </View>

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Rename</Text>

                  <Text style={styles.optionDescription}>Choose a clearer title</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setMode('delete')}
                style={({ pressed }) => [styles.menuOption, pressed && styles.pressed]}
              >
                <View style={[styles.optionIcon, styles.deleteIcon]}>
                  <Ionicons name="trash-outline" size={21} color={colors.danger} />
                </View>

                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, styles.dangerText]}>Delete</Text>

                  <Text style={styles.optionDescription}>Permanently remove this chat</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </>
          ) : null}

          {mode === 'rename' ? (
            <>
              <Text style={styles.dialogTitle}>Rename conversation</Text>

              <Text style={styles.dialogDescription}>
                Enter a short title that will help you find this conversation later.
              </Text>

              <TextInput
                autoFocus
                value={title}
                editable={!isBusy}
                maxLength={200}
                onChangeText={setTitle}
                onSubmitEditing={() => {
                  if (trimmedTitle && !isBusy) {
                    void onRename(trimmedTitle);
                  }
                }}
                placeholder="Conversation title"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primaryLight}
                style={styles.input}
              />

              <Text style={styles.characterCount}>{title.length}/200</Text>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setMode('menu')}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={!trimmedTitle || isBusy}
                  onPress={() => void onRename(trimmedTitle)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    (!trimmedTitle || isBusy) && styles.disabled,
                  ]}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}

          {mode === 'delete' ? (
            <>
              <View style={styles.warningIcon}>
                <Ionicons name="trash-outline" size={27} color={colors.danger} />
              </View>

              <Text style={styles.dialogTitle}>Delete conversation?</Text>

              <Text style={styles.dialogDescription}>
                “{conversation?.title}” will be removed from your conversation history. This action
                cannot be undone.
              </Text>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setMode('menu')}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void onDelete()}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                    isBusy && styles.disabled,
                  ]}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(5, 3, 12, 0.78)',
  },
  dialog: {
    width: '100%',
    maxWidth: 430,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headingContent: {
    flex: 1,
    marginRight: 12,
  },
  dialogTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  currentTitle: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  deleteIcon: {
    backgroundColor: colors.dangerBackground,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  optionDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  dangerText: {
    color: colors.danger,
  },
  dialogDescription: {
    marginTop: 9,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 13,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  characterCount: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  secondaryButton: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  warningIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: colors.dangerBackground,
  },
  deleteButton: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#B63C5E',
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
