import type { ChatMessage } from '@velunee/contracts';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

import { MarkdownMessage } from './markdown-message';
import { MessageSpeaker } from './message-speaker';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser ? (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>V</Text>
        </View>
      ) : null}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isUser ? (
          <Text style={[styles.message, styles.userMessage]}>{message.content}</Text>
        ) : (
          <>
            <MarkdownMessage
              content={message.content}
              isStreaming={message.id.startsWith('stream-assistant-')}
            />
            {!message.id.startsWith('stream-assistant-') && message.content.trim() ? (
              <MessageSpeaker text={message.content} />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 16,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
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
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 5,
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  message: {
    fontSize: 16,
    lineHeight: 23,
  },
  userMessage: {
    color: colors.white,
  },
});
