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
