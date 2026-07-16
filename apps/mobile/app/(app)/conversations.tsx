import { Ionicons } from '@expo/vector-icons';
import type { ConversationListItem } from '@velunee/contracts';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationManagementModal } from '@/components/conversation-management-modal';
import {
  deleteConversation,
  loadConversation,
  loadConversations,
  renameConversation,
} from '@/features/chat/api';
import { ApiError } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';
import { colors } from '@/theme/colors';

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function returnToChat(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(app)/(tabs)/chat' as Href);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load your conversations.';
}

export default function ConversationsScreen(): React.JSX.Element {
  const setConversationHistory = useChatStore((state) => state.setConversationHistory);

  const clearConversation = useChatStore((state) => state.clearConversation);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [openingId, setOpeningId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(
    null,
  );

  const [isManaging, setIsManaging] = useState(false);

  const activeConversationId = useChatStore((state) => state.conversationId);

  const fetchConversations = useCallback(async (refreshing = false): Promise<void> => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const response = await loadConversations();

      setConversations(response.conversations);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const openConversation = useCallback(
    async (conversation: ConversationListItem): Promise<void> => {
      if (openingId) return;

      setOpeningId(conversation.id);
      setErrorMessage(null);

      try {
        const history = await loadConversation(conversation.id);

        setConversationHistory(history.conversationId, history.messages);

        returnToChat();
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setOpeningId(null);
      }
    },
    [openingId, setConversationHistory],
  );

  const startNewConversation = useCallback((): void => {
    clearConversation();
    returnToChat();
  }, [clearConversation]);

  const handleRename = useCallback(
    async (title: string): Promise<void> => {
      if (!selectedConversation) return;

      setIsManaging(true);
      setErrorMessage(null);

      try {
        await renameConversation(selectedConversation.id, title);

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversation.id
              ? {
                  ...conversation,
                  title,
                  updatedAt: new Date().toISOString(),
                }
              : conversation,
          ),
        );

        setSelectedConversation(null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsManaging(false);
      }
    },
    [selectedConversation],
  );

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!selectedConversation) return;

    setIsManaging(true);
    setErrorMessage(null);

    try {
      await deleteConversation(selectedConversation.id);

      setConversations((current) =>
        current.filter((conversation) => conversation.id !== selectedConversation.id),
      );

      if (activeConversationId === selectedConversation.id) {
        clearConversation();
      }

      setSelectedConversation(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsManaging(false);
    }
  }, [activeConversationId, clearConversation, selectedConversation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>Conversations</Text>

          <Text style={styles.subtitle}>Continue where you left off</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a new conversation"
          onPress={startNewConversation}
          style={({ pressed }) => [
            styles.headerButton,
            styles.newButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="create-outline" size={22} color={colors.primaryLight} />
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable accessibilityRole="button" onPress={() => void fetchConversations()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryMuted} />

          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, conversations.length === 0 && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void fetchConversations(true)}
              tintColor={colors.primaryMuted}
              colors={[colors.primaryMuted]}
            />
          }
          renderItem={({ item }) => {
            const isOpening = openingId === item.id;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open conversation: ${item.title}`}
                disabled={openingId !== null}
                onPress={() => void openConversation(item)}
                style={({ pressed }) => [
                  styles.conversationCard,
                  pressed && styles.pressed,
                  openingId !== null && !isOpening && styles.disabled,
                ]}
              >
                <View style={styles.conversationIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={21}
                    color={colors.primaryLight}
                  />
                </View>

                <View style={styles.conversationContent}>
                  <View style={styles.conversationTopRow}>
                    <Text numberOfLines={1} style={styles.conversationTitle}>
                      {item.title}
                    </Text>

                    <Text style={styles.time}>{formatUpdatedAt(item.updatedAt)}</Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Manage conversation: ${item.title}`}
                      disabled={openingId !== null || isManaging}
                      hitSlop={10}
                      onPress={() => setSelectedConversation(item)}
                      style={({ pressed }) => [
                        styles.manageButton,
                        pressed && styles.pressed,
                        (openingId !== null || isManaging) && styles.disabled,
                      ]}
                    >
                      {isOpening ? (
                        <ActivityIndicator size="small" color={colors.primaryMuted} />
                      ) : (
                        <Ionicons name="ellipsis-vertical" size={18} color={colors.primaryLight} />
                      )}
                    </Pressable>
                  </View>

                  <Text numberOfLines={2} style={styles.preview}>
                    {item.preview || 'No messages yet'}
                  </Text>

                  <Text style={styles.messageCount}>
                    {item.messageCount} {item.messageCount === 1 ? 'message' : 'messages'}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={38} color={colors.primaryLight} />
              </View>

              <Text style={styles.emptyTitle}>No conversations yet</Text>

              <Text style={styles.emptyText}>
                Start chatting with Velunee and your conversations will appear here.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={startNewConversation}
                style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={20} color={colors.white} />

                <Text style={styles.startButtonText}>Start a conversation</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <ConversationManagementModal
        conversation={selectedConversation}
        isBusy={isManaging}
        onClose={() => setSelectedConversation(null)}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  newButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
    marginHorizontal: 10,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    backgroundColor: colors.dangerBackground,
  },
  errorText: {
    flex: 1,
    marginRight: 12,
    color: colors.danger,
    fontSize: 13,
  },
  retryText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingBottom: 28,
  },
  emptyList: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  manageButton: {
    width: 30,
    height: 30,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  conversationIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  conversationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationTitle: {
    flex: 1,
    marginRight: 10,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
  },
  preview: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  messageCount: {
    marginTop: 7,
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    maxWidth: 310,
    marginTop: 9,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  startButtonText: {
    marginLeft: 7,
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
