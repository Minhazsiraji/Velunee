import { GoogleGenAI } from '@google/genai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  locale?: string;
  timezone?: string;
  /** Extra situational context (e.g. live weather) injected into the system prompt. */
  context?: string;
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

export type VisionMode = 'selfie' | 'outfit' | 'general';

export interface VisionRequest {
  imageBase64: string;
  mimeType: string;
  prompt?: string;
  mode: VisionMode;
  locale?: string;
  userId: string;
  requestId: string;
}

export interface AudioRequest {
  audioBase64: string;
  mimeType: string;
  locale?: string;
  userId: string;
  requestId: string;
}

export interface TranscriptionResult {
  text: string;
  provider: string;
  model: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIChunk>;
  analyzeImage(request: VisionRequest): Promise<AIResponse>;
  transcribeAudio(request: AudioRequest): Promise<TranscriptionResult>;
}

function buildVisionInstruction(mode: VisionMode, locale?: string): string {
  const base =
    mode === 'selfie'
      ? 'The user shared a selfie and wants warm, honest, specific feedback on how they look — a genuine compliment plus one or two kind, practical tips (grooming, angle, expression, colors). Be encouraging and respectful, never judgmental about body or identity.'
      : mode === 'outfit'
        ? 'The user shared clothing or a wardrobe and wants help choosing what to wear. Give clear, practical outfit advice (fit, colors, occasion-appropriateness) and, if they mention an occasion, tailor to it.'
        : 'Describe what you see and answer the user helpfully and kindly.';

  return [
    'You are Velunee, a warm, practical personal companion looking at an image the user shared.',
    base,
    'Never guess sensitive attributes (age, health, ethnicity). Keep it concise and friendly.',
    locale ? `Reply in the language most appropriate for locale ${locale}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function defaultVisionPrompt(mode: VisionMode): string {
  if (mode === 'selfie') return 'How do I look?';
  if (mode === 'outfit') return 'What should I wear? Help me pick.';
  return 'What do you see in this image?';
}

function buildSystemInstruction(locale?: string, timezone?: string, context?: string): string {
  return [
    'You are Velunee, a warm, practical, worldwide personal AI companion.',
    'Answer clearly, avoid pretending certainty, and never claim actions you did not perform.',
    'Protect private information and do not infer sensitive personal traits.',
    locale ? `Reply in the language most appropriate for locale ${locale}.` : '',
    timezone ? `The user timezone is ${timezone}.` : '',
    context ? context : '',
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

  async analyzeImage(request: VisionRequest): Promise<AIResponse> {
    const canned: Record<VisionMode, string> = {
      selfie:
        'You look great — bright, friendly, and put-together! Tip: face a soft light source and lift your chin slightly for an even more flattering angle.\n\n(Add a Gemini API key and set AI_PROVIDER=gemini to get real, personalized feedback on your photo.)',
      outfit:
        'Nice pick! This works well for a smart-casual day. Tip: keep one statement piece and let the rest stay neutral so the look feels balanced.\n\n(Add a Gemini API key and set AI_PROVIDER=gemini for tailored outfit advice on your actual photo.)',
      general:
        'Velunee received your image. Add a Gemini API key and set AI_PROVIDER=gemini to get a real description and helpful answer.',
    };

    return {
      text: canned[request.mode],
      provider: this.name,
      model: this.model,
    };
  }

  async transcribeAudio(_request: AudioRequest): Promise<TranscriptionResult> {
    return {
      text: '(Voice transcription needs a Gemini API key. Set AI_PROVIDER=gemini to convert your speech to text.)',
      provider: this.name,
      model: this.model,
    };
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
  create(
    input: Record<string, unknown>,
  ): Promise<InteractionResult | AsyncIterable<InteractionStreamEvent>>;
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
      system_instruction: buildSystemInstruction(request.locale, request.timezone, request.context),
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
      system_instruction: buildSystemInstruction(request.locale, request.timezone, request.context),
      store: false,
      stream: true,
    });

    if (!Symbol.asyncIterator || !(Symbol.asyncIterator in Object(result))) {
      const fallback = result as InteractionResult;
      if (fallback.output_text) yield { text: fallback.output_text };
      return;
    }

    for await (const event of result as AsyncIterable<InteractionStreamEvent>) {
      const deltaText = typeof event.delta === 'string' ? event.delta : event.delta?.text;
      const text = deltaText ?? event.text ?? event.output_text;
      if (typeof text === 'string' && text.length > 0) {
        yield { text };
      }
    }
  }

  async analyzeImage(request: VisionRequest): Promise<AIResponse> {
    const prompt = request.prompt?.trim() || defaultVisionPrompt(request.mode);

    const result = (await this.interactions.create({
      model: this.model,
      input: [
        { type: 'input_text', text: prompt },
        {
          type: 'input_image',
          image_url: `data:${request.mimeType};base64,${request.imageBase64}`,
        },
      ],
      system_instruction: buildVisionInstruction(request.mode, request.locale),
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

  async transcribeAudio(request: AudioRequest): Promise<TranscriptionResult> {
    const localeHint = request.locale
      ? ` The audio is likely in the language for locale ${request.locale}.`
      : '';

    const result = (await this.interactions.create({
      model: this.model,
      input: [
        {
          type: 'input_text',
          text: `Transcribe this audio to plain text. Return only the transcript, no commentary.${localeHint}`,
        },
        {
          type: 'input_audio',
          audio_url: `data:${request.mimeType};base64,${request.audioBase64}`,
        },
      ],
      store: false,
    })) as InteractionResult;

    const text = result.output_text?.trim();
    if (!text) throw new Error('Gemini returned an empty transcript');

    return { text, provider: this.name, model: this.model };
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
