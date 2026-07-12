import type { ChatMessage } from '@velunee/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';

import { loadChatHistory, streamChatMessage } from './api';

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface FailedRequest {
  content: string;
  history: HistoryItem[];
}

interface ChatController {
  messages: ChatMessage[];
  input: string;
  errorMessage: string | null;
  isSending: boolean;
  isWaitingForResponse: boolean;
  isLoadingHistory: boolean;
  canSend: boolean;
  canRetry: boolean;
  setInput: (value: string) => void;
  send: () => Promise<void>;
  retry: () => Promise<void>;
  stopGenerating: () => void;
  dismissError: () => void;
  startNewConversation: () => void;
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createLocalUserMessage(content: string): ChatMessage {
  return {
    id: createLocalId('local-user'),
    role: 'user',
    content,
    inputMode: 'text',
    createdAt: new Date().toISOString(),
  };
}

function createStreamingMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: 'assistant',
    content,
    inputMode: 'text',
    createdAt: new Date().toISOString(),
  };
}

function createHistory(messages: ChatMessage[]): HistoryItem[] {
  return messages
    .filter(
      (message) =>
        message.id !== 'welcome' && (message.role === 'user' || message.role === 'assistant'),
    )
    .slice(-20)
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content.slice(0, 4_000),
    }));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Velunee could not complete the request.';
}

function getLocalization(): {
  locale: string;
  timezone: string;
} {
  try {
    const options = Intl.DateTimeFormat().resolvedOptions();

    return {
      locale: options.locale || 'en',
      timezone: options.timeZone || 'Asia/Dhaka',
    };
  } catch {
    return {
      locale: 'en',
      timezone: 'Asia/Dhaka',
    };
  }
}

export function useChatController(): ChatController {
  const {
    conversationId,
    messages,
    setConversationId,
    setConversationHistory,
    addMessage,
    updateMessage,
    removeMessage,
    clearConversation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);

  const sendingRef = useRef(false);

  const streamControllerRef = useRef<AbortController | null>(null);

  const historyLoadedRef = useRef(false);

  useEffect(() => {
    if (historyLoadedRef.current) return;

    historyLoadedRef.current = true;
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const history = await loadChatHistory();

        if (!cancelled) {
          setConversationHistory(history.conversationId, history.messages);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [setConversationHistory]);

  useEffect(
    () => () => {
      streamControllerRef.current?.abort();
    },
    [],
  );

  const submit = useCallback(
    async (request: FailedRequest, appendLocalMessage: boolean): Promise<void> => {
      if (sendingRef.current || isLoadingHistory) {
        return;
      }

      const temporaryMessageId = createLocalId('stream-assistant');

      const streamController = new AbortController();

      streamControllerRef.current = streamController;

      let streamedText = '';
      let streamingMessageAdded = false;

      sendingRef.current = true;
      setIsSending(true);
      setIsWaitingForResponse(true);
      setErrorMessage(null);

      if (appendLocalMessage) {
        addMessage(createLocalUserMessage(request.content));
      }

      try {
        const localization = getLocalization();

        await streamChatMessage(
          {
            conversationId,
            message: request.content,
            inputMode: 'text',
            locale: localization.locale,
            timezone: localization.timezone,
            history: request.history,
          },
          {
            onMeta: (event) => {
              setConversationId(event.conversationId);
            },

            onDelta: (delta) => {
              streamedText += delta;

              if (!streamingMessageAdded) {
                streamingMessageAdded = true;
                setIsWaitingForResponse(false);

                addMessage(createStreamingMessage(temporaryMessageId, streamedText));

                return;
              }

              updateMessage(temporaryMessageId, {
                content: streamedText,
              });
            },

            onDone: (event) => {
              if (streamingMessageAdded) {
                updateMessage(temporaryMessageId, {
                  id: event.messageId,
                  content: streamedText,
                });
              }
            },
          },
          streamController.signal,
        );

        if (!streamedText.trim()) {
          throw new ApiError('Velunee returned an empty response. Please try again.', 502);
        }

        setFailedRequest(null);
      } catch (error) {
        if (streamController.signal.aborted) {
          setFailedRequest(null);
          setErrorMessage(null);
        } else {
          if (streamingMessageAdded) {
            removeMessage(temporaryMessageId);
          }

          setErrorMessage(getErrorMessage(error));
          setFailedRequest(request);
        }
      } finally {
        if (streamControllerRef.current === streamController) {
          streamControllerRef.current = null;
        }

        sendingRef.current = false;
        setIsSending(false);
        setIsWaitingForResponse(false);
      }
    },
    [addMessage, conversationId, isLoadingHistory, removeMessage, setConversationId, updateMessage],
  );

  const send = useCallback(async (): Promise<void> => {
    const content = input.trim();

    if (!content || sendingRef.current || isLoadingHistory) {
      return;
    }

    const request: FailedRequest = {
      content,
      history: createHistory(messages),
    };

    setInput('');

    await submit(request, true);
  }, [input, isLoadingHistory, messages, submit]);

  const retry = useCallback(async (): Promise<void> => {
    if (!failedRequest || sendingRef.current || isLoadingHistory) {
      return;
    }

    await submit(failedRequest, false);
  }, [failedRequest, isLoadingHistory, submit]);

  const stopGenerating = useCallback((): void => {
    streamControllerRef.current?.abort();
  }, []);

  const dismissError = useCallback((): void => {
    setErrorMessage(null);
    setFailedRequest(null);
  }, []);

  const startNewConversation = useCallback((): void => {
    if (sendingRef.current || isLoadingHistory) {
      return;
    }

    clearConversation();
    setInput('');
    setErrorMessage(null);
    setFailedRequest(null);
  }, [clearConversation, isLoadingHistory]);

  return {
    messages,
    input,
    errorMessage,
    isSending,
    isWaitingForResponse,
    isLoadingHistory,
    canSend: input.trim().length > 0 && !isSending && !isLoadingHistory,
    canRetry: failedRequest !== null && !isSending && !isLoadingHistory,
    setInput,
    send,
    retry,
    stopGenerating,
    dismissError,
    startNewConversation,
  };
}
