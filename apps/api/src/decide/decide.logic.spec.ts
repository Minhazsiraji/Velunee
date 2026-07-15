import type { AffordabilityResponse } from '@velunee/contracts';
import {
  buildConsidered,
  buildDecidePrompt,
  buildDeterministicDecision,
  detectDecisionKind,
  extractAmountMinor,
  parseAiDecision,
  pickNextAction,
  type DecideContext,
} from './decide.logic';

function context(overrides: Partial<DecideContext> = {}): DecideContext {
  return {
    currency: 'BDT',
    balanceConfigured: true,
    safeToSpendTodayMinor: 833_00,
    remainingMinor: 15_000_00,
    weather: { temperatureC: 30, condition: 'Partly cloudy', advice: null },
    memoryHighlights: ['Prefers simple office outfits'],
    ...overrides,
  };
}

const affordabilityNo: AffordabilityResponse = {
  verdict: 'no',
  title: "Not within this month's plan",
  explanation: "It's BDT 5,000 more than what's left in your plan.",
  goalImpacts: [{ goalId: '11111111-1111-4111-8111-111111111111', name: 'Travel', delayDays: 10 }],
  calculation: ['Purchase amount = BDT 20,000'],
};

describe('detectDecisionKind', () => {
  it('routes the documented question shapes', () => {
    expect(detectDecisionKind('Can I afford this phone?')).toBe('affordability');
    expect(detectDecisionKind('Should I buy this or wait?')).toBe('affordability');
    expect(detectDecisionKind('Tomorrow office, what should I wear?')).toBe('outfit');
    expect(detectDecisionKind('Should I go out today?')).toBe('timing');
    expect(detectDecisionKind('Which lesson should I study first?')).toBe('general');
  });
});

describe('extractAmountMinor', () => {
  it('reads amounts with and without separators', () => {
    expect(extractAmountMinor('Can I afford a 2500 taka dinner?')).toBe(2_500_00);
    expect(extractAmountMinor('Should I buy this 1,250.50 shirt?')).toBe(125_050);
    expect(extractAmountMinor('Should I go out today?')).toBeNull();
  });
});

describe('buildConsidered', () => {
  it('turns available context into labelled facts', () => {
    const items = buildConsidered(context());
    const labels = items.map((item) => item.label);
    expect(labels).toContain('Weather');
    expect(labels).toContain('Safe to spend today');
    expect(labels).toContain("Left in this month's plan");
    expect(labels).toContain('What you asked me to remember');
  });

  it('omits money facts when Balance is not configured', () => {
    const items = buildConsidered(
      context({ balanceConfigured: false, safeToSpendTodayMinor: null, remainingMinor: null }),
    );
    expect(items.map((item) => item.label)).not.toContain('Safe to spend today');
  });
});

describe('buildDecidePrompt', () => {
  it('asks for strict JSON and includes the known facts', () => {
    const prompt = buildDecidePrompt(context());
    expect(prompt).toContain('STRICT JSON');
    expect(prompt).toContain('recommendation');
    expect(prompt).toContain('30°C');
    expect(prompt).toContain('simple office outfits');
  });

  it('stays usable with no context at all', () => {
    const prompt = buildDecidePrompt(
      context({
        balanceConfigured: false,
        safeToSpendTodayMinor: null,
        remainingMinor: null,
        weather: null,
        memoryHighlights: [],
      }),
    );
    expect(prompt).toContain('No extra context available');
  });
});

describe('parseAiDecision', () => {
  it('parses clean JSON', () => {
    const parsed = parseAiDecision(
      '{"recommendation":"Wear navy","reasoning":"It fits the weather","alternative":"Beige","impact":"Comfortable day"}',
    );
    expect(parsed).toEqual({
      recommendation: 'Wear navy',
      reasoning: 'It fits the weather',
      alternative: 'Beige',
      impact: 'Comfortable day',
    });
  });

  it('recovers JSON wrapped in prose or code fences', () => {
    const parsed = parseAiDecision(
      'Sure! ```json\n{"recommendation":"Go by bus","reasoning":"Rain expected"}\n``` hope that helps',
    );
    expect(parsed?.recommendation).toBe('Go by bus');
    expect(parsed?.alternative).toBeNull();
  });

  it('returns null when required fields are missing or unparseable', () => {
    expect(parseAiDecision('no json here')).toBeNull();
    expect(parseAiDecision('{"reasoning":"only reasoning"}')).toBeNull();
  });
});

describe('buildDeterministicDecision', () => {
  it('speaks straight from the affordability verdict', () => {
    const decision = buildDeterministicDecision({
      kind: 'affordability',
      context: context(),
      affordability: affordabilityNo,
    });
    expect(decision.recommendation).toBe("Not within this month's plan");
    expect(decision.impact).toContain('Travel');
  });

  it('gives weather-aware outfit advice without an AI', () => {
    const decision = buildDeterministicDecision({
      kind: 'outfit',
      context: context({
        weather: { temperatureC: 28, condition: 'Light rain', advice: 'Carry an umbrella today.' },
      }),
      affordability: null,
    });
    expect(decision.recommendation.toLowerCase()).toContain('umbrella');
  });

  it('always returns something useful for general questions', () => {
    const decision = buildDeterministicDecision({
      kind: 'general',
      context: context(),
      affordability: null,
    });
    expect(decision.recommendation.length).toBeGreaterThan(0);
    expect(decision.reasoning.length).toBeGreaterThan(0);
  });
});

describe('pickNextAction', () => {
  it('routes money verdicts to the right follow-up', () => {
    expect(pickNextAction('affordability', affordabilityNo).kind).toBe('open_balance');
    expect(pickNextAction('affordability', { ...affordabilityNo, verdict: 'yes' }).kind).toBe(
      'add_expense',
    );
  });

  it('defaults everything else to chat', () => {
    expect(pickNextAction('general', null).kind).toBe('ask_chat');
    expect(pickNextAction('outfit', null).kind).toBe('ask_chat');
  });
});
