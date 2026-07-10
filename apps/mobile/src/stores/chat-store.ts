import type { ChatMessage } from '@velunee/contracts';
import { create } from 'zustand';

interface ChatState {
  conversationId?: string;
  messages: ChatMessage[];
  setConversationId(conversationId: string): void;
  addMessage(message: ChatMessage): void;
  clearConversation(): void;
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi, I’m Velunee. Tell me what’s on your mind, what you need to decide, or what you want to plan today.",
  inputMode: 'text',
  createdAt: new Date(0).toISOString(),
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [welcomeMessage],
  setConversationId: (conversationId) => set({ conversationId }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearConversation: () => set({ conversationId: undefined, messages: [welcomeMessage] }),
}));
