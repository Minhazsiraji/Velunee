import { Ionicons } from '@expo/vector-icons';
import type { ConversationListItem } from '@velunee/contracts';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    setMode('menu');
    setTitle(conversation?.title ?? '');
  }, [conversation]);

  // Lift the sheet above the keyboard. A React Native Modal is a separate
  // window that Android does not resize for the keyboard, so KeyboardAvoidingView
  // is unreliable here — track the height and pad the container instead.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const trimmedTitle = title.trim();

  const close = (): void => {
    if (!isBusy) onClose();
  };

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={conversation !== null}
      animationType="slide"
      onRequestClose={close}
    >
      <View style={[styles.root, { paddingBottom: keyboardHeight }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={close}
          style={styles.backdrop}
        />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {mode === 'menu' ? (
            <>
              <Text numberOfLines={1} style={styles.sheetTitle}>
                {conversation?.title || 'Conversation'}
              </Text>
              <Text style={styles.sheetSubtitle}>Manage this conversation</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rename conversation"
                onPress={() => setMode('rename')}
                android_ripple={{ color: 'rgba(180, 150, 255, 0.10)' }}
                style={styles.action}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="pencil" size={20} color={colors.primaryLight} />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>Rename</Text>
                  <Text style={styles.actionSubtitle}>Choose a clearer title</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete conversation"
                onPress={() => setMode('delete')}
                android_ripple={{ color: 'rgba(255, 156, 174, 0.10)' }}
                style={styles.action}
              >
                <View style={[styles.actionIcon, styles.actionIconDanger]}>
                  <Ionicons name="trash" size={20} color={colors.danger} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, styles.dangerText]}>Delete</Text>
                  <Text style={styles.actionSubtitle}>Permanently remove this chat</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={close}
                android_ripple={{ color: 'rgba(180, 150, 255, 0.10)' }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : null}

          {mode === 'rename' ? (
            <>
              <Text style={styles.sheetTitle}>Rename conversation</Text>
              <Text style={styles.sheetSubtitle}>
                Enter a short title to help you find this chat later.
              </Text>

              <TextInput
                autoFocus
                value={title}
                editable={!isBusy}
                maxLength={200}
                onChangeText={setTitle}
                onSubmitEditing={() => {
                  if (trimmedTitle && !isBusy) void onRename(trimmedTitle);
                }}
                placeholder="Conversation title"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primaryLight}
                style={styles.input}
              />
              <Text style={styles.charCount}>{title.length}/200</Text>

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setMode('menu')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!trimmedTitle || isBusy}
                  onPress={() => void onRename(trimmedTitle)}
                  style={
                    !trimmedTitle || isBusy
                      ? [styles.primaryButton, styles.disabled]
                      : styles.primaryButton
                  }
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
                <Ionicons name="trash" size={24} color={colors.danger} />
              </View>
              <Text style={styles.sheetTitle}>Delete conversation?</Text>
              <Text style={styles.sheetSubtitle}>
                “{conversation?.title || 'This chat'}” will be removed from your history. This
                cannot be undone.
              </Text>

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setMode('menu')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void onDelete()}
                  style={isBusy ? [styles.deleteButton, styles.disabled] : styles.deleteButton}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 3, 12, 0.78)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  actionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  actionIconDanger: {
    backgroundColor: colors.dangerBackground,
  },
  actionText: {
    flexShrink: 1,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  dangerText: {
    color: colors.danger,
  },
  cancelButton: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
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
  charCount: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  secondaryButton: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  warningIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: colors.dangerBackground,
  },
  deleteButton: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
