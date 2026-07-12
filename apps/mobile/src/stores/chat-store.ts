import type { ChatMessage } from '@velunee/contracts';
import { create } from 'zustand';

interface ChatState {
  conversationId?: string;
  messages: ChatMessage[];
  setConversationId(conversationId: string): void;
  setConversationHistory(conversationId: string | null, messages: ChatMessage[]): void;
  addMessage(message: ChatMessage): void;
  updateMessage(messageId: string, updates: Partial<ChatMessage>): void;
  removeMessage(messageId: string): void;
  clearConversation(): void;
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi, I’m Velunee. Tell me what’s on your mind, what you need to decide, or what you want to plan today.',
  inputMode: 'text',
  createdAt: new Date(0).toISOString(),
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [welcomeMessage],

  setConversationId: (conversationId) => set({ conversationId }),

  setConversationHistory: (conversationId, messages) =>
    set({
      conversationId: conversationId ?? undefined,
      messages: messages.length > 0 ? messages : [welcomeMessage],
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId ? { ...message, ...updates } : message,
      ),
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== messageId),
    })),

  clearConversation: () =>
    set({
      conversationId: undefined,
      messages: [welcomeMessage],
    }),
}));
