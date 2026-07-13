import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@velunee/contracts';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatComposer } from '@/components/chat-composer';
import { ChatErrorBanner } from '@/components/chat-error-banner';
import { ChatMessageBubble } from '@/components/chat-message-bubble';
import { useChatController } from '@/features/chat/use-chat-controller';
import { colors } from '@/theme/colors';

export default function ChatScreen(): React.JSX.Element {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const {
    messages,
    input,
    errorMessage,
    isSending,
    isWaitingForResponse,
    isLoadingHistory,
    canSend,
    canRetry,
    setInput,
    send,
    retry,
    stopGenerating,
    dismissError,
    startNewConversation,
  } = useChatController();

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, isSending]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>VELUNEE</Text>

            <Text style={styles.subtitle}>Your personal AI companion</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask about a photo"
              disabled={isSending}
              onPress={() => router.push('/(app)/vision' as Href)}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.pressed,
                isSending && styles.disabled,
              ]}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primaryLight} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View conversations"
              disabled={isSending}
              onPress={() => router.push('/(app)/conversations' as Href)}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.pressed,
                isSending && styles.disabled,
              ]}
            >
              <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              accessibilityState={{
                disabled: isSending || isLoadingHistory,
              }}
              disabled={isSending || isLoadingHistory}
              onPress={startNewConversation}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.pressed,
                (isSending || isLoadingHistory) && styles.disabled,
              ]}
            >
              <Ionicons name="create-outline" size={22} color={colors.primaryLight} />
            </Pressable>
          </View>
        </View>

        {isLoadingHistory ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator size="small" color={colors.primaryMuted} />

            <Text style={styles.historyLoadingText}>Loading your saved conversation...</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => <ChatMessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({
              animated: true,
            });
          }}
          ListFooterComponent={isWaitingForResponse ? <TypingIndicator /> : null}
        />

        {errorMessage ? (
          <ChatErrorBanner
            message={errorMessage}
            canRetry={canRetry}
            onRetry={() => void retry()}
            onDismiss={dismissError}
          />
        ) : null}

        <ChatComposer
          value={input}
          canSend={canSend}
          isSending={isSending}
          onChangeText={setInput}
          onSend={() => void send()}
          onStop={stopGenerating}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypingIndicator(): React.JSX.Element {
  return (
    <View style={styles.typingRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>V</Text>
      </View>

      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={colors.primaryMuted} />

        <Text style={styles.typingText}>Velunee is thinking...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  brand: {
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  historyLoadingText: {
    marginLeft: 8,
    color: colors.textMuted,
    fontSize: 13,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.surface,
  },
  typingText: {
    marginLeft: 9,
    color: colors.textSecondary,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
