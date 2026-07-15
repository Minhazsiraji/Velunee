import type {
  AffordabilityResponse,
  DecideConsideredItem,
  DecideNextAction,
  DecisionKind,
} from '@velunee/contracts';
import { formatMinor } from '../balance/balance.math';

export interface DecideContext {
  currency: string;
  balanceConfigured: boolean;
  safeToSpendTodayMinor: number | null;
  remainingMinor: number | null;
  weather: { temperatureC: number; condition: string | null; advice: string | null } | null;
  memoryHighlights: string[];
}

export interface ParsedDecision {
  recommendation: string;
  reasoning: string;
  alternative: string | null;
  impact: string | null;
}

const AMOUNT_PATTERN = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/;

// Keyword classification — instant, free and predictable. The AI shapes the
// wording of the answer, but never the routing or the financial verdict.
export function detectDecisionKind(question: string): DecisionKind {
  const q = question.toLowerCase();

  if (
    /\b(afford|worth it|buy or (save|wait)|save or buy|should i (buy|get|purchase)|can i (buy|get))\b/.test(
      q,
    )
  ) {
    return 'affordability';
  }
  if (/\b(wear|outfit|dress|clothes|what to put on|which (dress|shirt|outfit))\b/.test(q)) {
    return 'outfit';
  }
  if (
    /\b(go out|stay in|leave (early|now|late)|today or tomorrow|when should i|what time should i)\b/.test(
      q,
    )
  ) {
    return 'timing';
  }
  return 'general';
}

export function extractAmountMinor(question: string): number | null {
  const match = AMOUNT_PATTERN.exec(question);
  if (!match) return null;
  const whole = Number(match[1]!.replace(/,/g, ''));
  const cents = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  const amountMinor = whole * 100 + cents;
  return amountMinor > 0 ? amountMinor : null;
}

export function buildConsidered(context: DecideContext): DecideConsideredItem[] {
  const considered: DecideConsideredItem[] = [];

  if (context.weather) {
    const parts = [`${context.weather.temperatureC}°C`];
    if (context.weather.condition) parts.push(context.weather.condition);
    considered.push({ label: 'Weather', value: parts.join(', ') });
  }

  if (context.balanceConfigured && context.safeToSpendTodayMinor !== null) {
    considered.push({
      label: 'Safe to spend today',
      value: formatMinor(context.currency, context.safeToSpendTodayMinor),
    });
  }

  if (context.balanceConfigured && context.remainingMinor !== null) {
    considered.push({
      label: "Left in this month's plan",
      value: formatMinor(context.currency, context.remainingMinor),
    });
  }

  if (context.memoryHighlights.length > 0) {
    considered.push({
      label: 'What you asked me to remember',
      value: `${context.memoryHighlights.length} ${
        context.memoryHighlights.length === 1 ? 'note' : 'notes'
      }`,
    });
  }

  return considered;
}

// The situational block handed to the model as system context. Facts only —
// the model is told to reason from them and to return strict JSON.
export function buildDecidePrompt(context: DecideContext): string {
  const lines: string[] = [
    'You are Velunee helping the user make one everyday decision.',
    'Use ONLY the facts below plus general knowledge. Do not invent personal facts.',
    'Reply with STRICT JSON and nothing else, shaped exactly as:',
    '{"recommendation": string, "reasoning": string, "alternative": string, "impact": string}',
    'recommendation: one clear, warm, practical recommendation (max 40 words).',
    'reasoning: why, referencing the facts simply (max 40 words).',
    'alternative: one other reasonable choice (max 30 words).',
    'impact: what might happen with the recommended choice (max 30 words).',
    'Never shame the user. Keep them in control.',
    '',
    'Facts Velunee knows right now:',
  ];

  if (context.weather) {
    const w = [`temperature ${context.weather.temperatureC}°C`];
    if (context.weather.condition) w.push(`conditions ${context.weather.condition}`);
    if (context.weather.advice) w.push(context.weather.advice);
    lines.push(`- Weather: ${w.join(', ')}.`);
  }
  if (context.balanceConfigured && context.safeToSpendTodayMinor !== null) {
    lines.push(
      `- The user can safely spend about ${formatMinor(context.currency, context.safeToSpendTodayMinor)} today.`,
    );
  }
  if (context.balanceConfigured && context.remainingMinor !== null) {
    lines.push(
      `- ${formatMinor(context.currency, context.remainingMinor)} remains in this month's plan.`,
    );
  }
  for (const highlight of context.memoryHighlights) {
    lines.push(`- The user asked Velunee to remember: ${highlight}`);
  }
  if (lines[lines.length - 1] === 'Facts Velunee knows right now:') {
    lines.push('- (No extra context available; rely on general knowledge and stay practical.)');
  }

  return lines.join('\n');
}

// Defensive JSON extraction — models often wrap JSON in prose or code fences.
export function parseAiDecision(text: string): ParsedDecision | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const recommendation =
    typeof record.recommendation === 'string' ? record.recommendation.trim() : '';
  const reasoning = typeof record.reasoning === 'string' ? record.reasoning.trim() : '';
  if (!recommendation || !reasoning) return null;

  const alternative =
    typeof record.alternative === 'string' && record.alternative.trim().length > 0
      ? record.alternative.trim()
      : null;
  const impact =
    typeof record.impact === 'string' && record.impact.trim().length > 0
      ? record.impact.trim()
      : null;

  return { recommendation, reasoning, alternative, impact };
}

// Used when the AI is unavailable or its output can't be parsed. Always useful,
// and for money questions it speaks straight from the deterministic verdict.
export function buildDeterministicDecision(input: {
  kind: DecisionKind;
  context: DecideContext;
  affordability: AffordabilityResponse | null;
}): ParsedDecision {
  const { kind, context, affordability } = input;

  if (kind === 'affordability' && affordability) {
    return {
      recommendation: affordability.title,
      reasoning: affordability.explanation,
      alternative:
        affordability.verdict === 'no'
          ? 'Waiting a little, or trimming another category first, keeps your plan intact.'
          : 'You could also set it aside as a savings goal and buy it guilt-free later.',
      impact:
        affordability.goalImpacts.length > 0
          ? `This is about ${affordability.goalImpacts[0]!.delayDays} days of saving toward "${affordability.goalImpacts[0]!.name}".`
          : null,
    };
  }

  if (kind === 'outfit' && context.weather) {
    const rainy = context.weather.advice?.toLowerCase().includes('umbrella');
    return {
      recommendation: rainy
        ? 'Go with something comfortable and water-friendly, and carry a light layer or umbrella.'
        : `Dress for about ${context.weather.temperatureC}°C — comfortable and suited to your plans.`,
      reasoning: `Based on today's weather${context.weather.condition ? ` (${context.weather.condition})` : ''}.`,
      alternative: 'If your day turns formal, lean to a smarter version of the same outfit.',
      impact: 'You stay comfortable without a mid-day change of plans.',
    };
  }

  if (kind === 'timing' && context.weather?.advice) {
    return {
      recommendation: context.weather.advice,
      reasoning: `Today's weather is ${context.weather.temperatureC}°C${context.weather.condition ? `, ${context.weather.condition}` : ''}.`,
      alternative: 'If timing is flexible, the calmer part of the day is usually easier.',
      impact: 'A small adjustment now avoids a bigger disruption later.',
    };
  }

  return {
    recommendation:
      "Here's a practical way to look at it — weigh the facts below and pick what fits your day.",
    reasoning:
      'Velunee gathered what it knows about your day. For a fuller back-and-forth, open a chat and add any details that matter to you.',
    alternative: null,
    impact: null,
  };
}

export function pickNextAction(
  kind: DecisionKind,
  affordability: AffordabilityResponse | null,
): DecideNextAction {
  if (kind === 'affordability' && affordability) {
    return affordability.verdict === 'no'
      ? { label: 'See your Balance plan', kind: 'open_balance' }
      : { label: 'Add this as an expense', kind: 'add_expense' };
  }
  return { label: 'Talk it through in chat', kind: 'ask_chat' };
}
