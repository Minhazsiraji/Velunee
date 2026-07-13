export type ModerationDecision = 'approved' | 'review' | 'rejected';

export interface ModerationResult {
  decision: ModerationDecision;
  riskScore: number;
  categories: string[];
  providerReference?: string;
}

export interface ModerationProvider {
  checkText(text: string): Promise<ModerationResult>;
  checkImage(signedUrl: string): Promise<ModerationResult>;
}

/**
 * Deterministic, dependency-free moderation for community text.
 *
 * It errs toward sending borderline content to human review rather than
 * hard-blocking, and is intended as a safe default that a dedicated ML
 * moderation service can later replace behind the same interface.
 */

// Credible threats of violence — hard blocked.
const THREAT_PATTERNS: RegExp[] = [
  /\bi(?:'?m| am| will|'?ll)\s+(?:going to\s+)?(?:kill|hurt|harm|beat|stab|shoot)\s+(?:you|him|her|them|u)\b/i,
  /\bkill\s+(?:yourself|urself)\b/i,
];

// Common profanity roots — routed to review, not blocked.
const PROFANITY_PATTERNS: RegExp[] = [
  /\bf+u+c+k+/i,
  /\bs+h+i+t+/i,
  /\bb+i+t+c+h+/i,
  /\ba+s+s+h+o+l+e+/i,
  /\bc+u+n+t+/i,
];

const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function looksLikeSpam(text: string): boolean {
  const linkCount = countMatches(text, URL_PATTERN);
  if (linkCount >= 3) return true;

  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length >= 20) {
    const upper = letters.replace(/[^A-Z]/g, '').length;
    if (upper / letters.length > 0.7) return true;
  }

  // Long runs of a repeated character, e.g. "aaaaaaaaaa" or "!!!!!!!!".
  if (/(.)\1{9,}/.test(text)) return true;

  return false;
}

export class HeuristicModerationProvider implements ModerationProvider {
  readonly name = 'heuristic';

  async checkText(text: string): Promise<ModerationResult> {
    const categories: string[] = [];
    let riskScore = 0;

    for (const pattern of THREAT_PATTERNS) {
      if (pattern.test(text)) {
        return {
          decision: 'rejected',
          riskScore: 0.98,
          categories: ['violence', 'threat'],
          providerReference: this.name,
        };
      }
    }

    const profanityHits = PROFANITY_PATTERNS.reduce(
      (total, pattern) => total + (pattern.test(text) ? 1 : 0),
      0,
    );
    if (profanityHits > 0) {
      categories.push('profanity');
      riskScore = Math.max(riskScore, Math.min(0.4 + profanityHits * 0.15, 0.85));
    }

    if (looksLikeSpam(text)) {
      categories.push('spam');
      riskScore = Math.max(riskScore, 0.6);
    }

    const decision: ModerationDecision = categories.length > 0 ? 'review' : 'approved';

    return {
      decision,
      riskScore: decision === 'approved' ? 0.02 : riskScore,
      categories,
      providerReference: this.name,
    };
  }

  async checkImage(_signedUrl: string): Promise<ModerationResult> {
    // Images cannot be inspected without a vision provider; route to
    // human review so nothing is auto-published unchecked.
    return {
      decision: 'review',
      riskScore: 0.5,
      categories: ['unreviewed-image'],
      providerReference: this.name,
    };
  }
}
