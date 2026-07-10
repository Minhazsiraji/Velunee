import type { ChatMessage } from '@velunee/contracts';
import { Text, View } from 'react-native';

export function ChatBubble({ message }: { message: ChatMessage }): React.JSX.Element {
  const isUser = message.role === 'user';
  return (
    <View className={`mb-3 max-w-[88%] ${isUser ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-3xl px-4 py-3 ${
          isUser ? 'rounded-br-md bg-primary' : 'rounded-bl-md border border-border bg-surface'
        }`}
      >
        <Text className={`text-base leading-6 ${isUser ? 'text-canvas' : 'text-ink'}`}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}
