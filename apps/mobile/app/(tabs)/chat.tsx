import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import type { ChatMessage } from '@velunee/contracts';
import { ChatBubble } from '@/components/chat-bubble';
import { Screen } from '@/components/screen';
import { sendChatMessage } from '@/features/chat/api';
import { useChatStore } from '@/stores/chat-store';

const suggestions = ['Plan my evening', 'Help me make a decision', 'Give me a confidence boost'];

export default function ChatScreen(): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const conversationId = useChatStore((state) => state.conversationId);
  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const clearConversation = useChatStore((state) => state.clearConversation);

  const locale = getLocales()[0]?.languageTag ?? 'en';
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC', []);

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      addMessage(response.message);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
  });

  const submit = (preset?: string): void => {
    const message = (preset ?? draft).trim();
    if (!message || mutation.isPending) return;

    addMessage({
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      inputMode: 'text',
      createdAt: new Date().toISOString(),
    });
    setDraft('');
    mutation.mutate({
      conversationId,
      message,
      locale,
      timezone,
      inputMode: 'text',
      history: messages
        .filter((item) => item.id !== 'welcome' && item.role !== 'system')
        .slice(-12)
        .map((item) => ({ role: item.role as 'user' | 'assistant', content: item.content })),
    });
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const renderItem: ListRenderItem<ChatMessage> = ({ item }) => <ChatBubble message={item} />;

  return (
    <Screen scroll={false} contentContainerClassName="px-0 pb-[74px] pt-0">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
          <View>
            <Text className="text-xl font-black text-ink">Chat with Velunee</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-success" />
              <Text className="text-xs text-muted">Ready to help</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Start a new conversation"
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
            onPress={clearConversation}
          >
            <Ionicons name="create-outline" size={21} color="#FFF9FF" />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          className="flex-1"
          contentContainerClassName="px-5 py-5"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            mutation.isPending ? (
              <View className="mb-3 self-start rounded-3xl rounded-bl-md border border-border bg-surface px-4 py-3">
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#B66CFF" size="small" />
                  <Text className="text-sm text-muted">Velunee is thinking…</Text>
                </View>
              </View>
            ) : mutation.isError ? (
              <View className="mb-3 rounded-2xl border border-danger/40 bg-danger/10 p-3">
                <Text className="text-sm text-danger">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : 'The message could not be sent.'}
                </Text>
              </View>
            ) : null
          }
        />

        {messages.length === 1 ? (
          <View className="px-5 pb-3">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggestions}
              keyExtractor={(item) => item}
              contentContainerClassName="gap-2"
              renderItem={({ item }) => (
                <Pressable
                  className="rounded-full border border-border bg-surface px-4 py-2 active:bg-elevated"
                  onPress={() => submit(item)}
                >
                  <Text className="text-sm font-semibold text-ink">{item}</Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        <View className="border-t border-border bg-canvas px-4 pb-4 pt-3">
          <View className="flex-row items-end gap-2 rounded-[26px] border border-border bg-surface p-2">
            <Pressable
              accessibilityLabel="Attach image"
              className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
            >
              <Ionicons name="add" size={25} color="#B66CFF" />
            </Pressable>
            <TextInput
              className="max-h-32 min-h-11 flex-1 px-2 py-3 text-base text-ink"
              multiline
              placeholder="Ask Velunee anything…"
              placeholderTextColor="#8E849F"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => submit()}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            <Pressable
              accessibilityLabel={draft.trim() ? 'Send message' : 'Start voice input'}
              className={`h-11 w-11 items-center justify-center rounded-full ${
                draft.trim() ? 'bg-primary' : 'bg-secondary'
              }`}
              disabled={mutation.isPending}
              onPress={() => (draft.trim() ? submit() : undefined)}
            >
              <Ionicons
                name={draft.trim() ? 'arrow-up' : 'mic'}
                size={22}
                color="#0F0B1F"
              />
            </Pressable>
          </View>
          <Text className="mt-2 text-center text-[11px] text-muted">
            Velunee can make mistakes. Check important information.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
