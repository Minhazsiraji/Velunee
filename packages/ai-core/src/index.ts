import { GoogleGenAI } from '@google/genai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  locale?: string;
  timezone?: string;
  userId: string;
  requestId: string;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIChunk {
  text: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIChunk>;
}

function buildSystemInstruction(locale?: string, timezone?: string): string {
  return [
    'You are Velunee, a warm, practical, worldwide personal AI companion.',
    'Answer clearly, avoid pretending certainty, and never claim actions you did not perform.',
    'Protect private information and do not infer sensitive personal traits.',
    locale ? `Reply in the language most appropriate for locale ${locale}.` : '',
    timezone ? `The user timezone is ${timezone}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function latestUserMessage(messages: AIMessage[]): string {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  return latest?.content ?? '';
}

function buildConversationInput(messages: AIMessage[]): string {
  if (messages.length === 1) return messages[0]?.content ?? '';
  const transcript = messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role === 'user' ? 'USER' : 'VELUNEE'}: ${message.content}`)
    .join('\n\n');
  return `Use this transcript only as conversational context. The final USER entry is the current request.\n\n${transcript}`;
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'velunee-local-mock';

  async generate(request: AIRequest): Promise<AIResponse> {
    const input = latestUserMessage(request.messages);
    return {
      text: `Velunee is connected. You said: “${input}”\n\nAdd a Gemini API key and set AI_PROVIDER=gemini when you are ready to test live AI responses.`,
      provider: this.name,
      model: this.model,
    };
  }

  async *stream(request: AIRequest): AsyncIterable<AIChunk> {
    const response = await this.generate(request);
    const words = response.text.split(/(\s+)/).filter(Boolean);
    for (const word of words) {
      yield { text: word };
    }
  }
}

interface InteractionResult {
  output_text?: string;
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
  };
}

interface InteractionStreamEvent {
  delta?: string | { text?: string; type?: string };
  text?: string;
  output_text?: string;
  type?: string;
}

interface InteractionClient {
  create(input: Record<string, unknown>): Promise<InteractionResult | AsyncIterable<InteractionStreamEvent>>;
}

export interface GeminiAIProviderOptions {
  apiKey: string;
  model: string;
}

export class GeminiAIProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model: string;
  private readonly interactions: InteractionClient;

  constructor(options: GeminiAIProviderOptions) {
    const client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model;
    this.interactions = (client as unknown as { interactions: InteractionClient }).interactions;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const result = (await this.interactions.create({
      model: this.model,
      input: buildConversationInput(request.messages),
      system_instruction: buildSystemInstruction(request.locale, request.timezone),
      store: false,
    })) as InteractionResult;

    const text = result.output_text?.trim();
    if (!text) throw new Error('Gemini returned an empty response');

    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: result.usage?.total_input_tokens,
      outputTokens: result.usage?.total_output_tokens,
    };
  }

  async *stream(request: AIRequest): AsyncIterable<AIChunk> {
    const result = await this.interactions.create({
      model: this.model,
      input: buildConversationInput(request.messages),
      system_instruction: buildSystemInstruction(request.locale, request.timezone),
      store: false,
      stream: true,
    });

    if (!Symbol.asyncIterator || !(Symbol.asyncIterator in Object(result))) {
      const fallback = result as InteractionResult;
      if (fallback.output_text) yield { text: fallback.output_text };
      return;
    }

    for await (const event of result as AsyncIterable<InteractionStreamEvent>) {
      const deltaText =
        typeof event.delta === 'string' ? event.delta : event.delta?.text;
      const text = deltaText ?? event.text ?? event.output_text;
      if (typeof text === 'string' && text.length > 0) {
        yield { text };
      }
    }
  }
}

export function createAIProvider(options: {
  provider: 'mock' | 'gemini';
  geminiApiKey?: string;
  geminiModel: string;
}): AIProvider {
  if (options.provider === 'gemini') {
    if (!options.geminiApiKey) throw new Error('Gemini API key is missing');
    return new GeminiAIProvider({ apiKey: options.geminiApiKey, model: options.geminiModel });
  }
  return new MockAIProvider();
}
