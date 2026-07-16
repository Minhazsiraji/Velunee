import type { ExplanationStyle, LearnerLevel, LearnMode } from '@velunee/contracts';

export interface LearnerContext {
  country: string | null;
  curriculum: string | null;
  grade: string | null;
  subject: string | null;
  language: string;
  level: LearnerLevel;
  explanationStyle: ExplanationStyle;
}

const MODE_INSTRUCTION: Record<LearnMode, string> = {
  explain:
    'Explain the concept clearly, building from what a learner at this level already knows, and include one everyday analogy.',
  step_by_step:
    'Work through it step by step. Number each step and show the reasoning, not just the final result.',
  example:
    'Give one fully worked example, then a second similar problem with the final answer hidden for the learner to try.',
  practice:
    'Do NOT give the final answer first. Offer two or three practice questions of increasing difficulty, each with a small hint.',
  quiz: 'Create a short four-question quiz (mix of recall and application). List the questions first and put the answer key at the very end under a heading "Answers".',
};

const STYLE_INSTRUCTION: Record<ExplanationStyle, string> = {
  simple: 'Keep the language simple and encouraging.',
  step_by_step: 'Prefer a clear step-by-step structure.',
  exam_focused: 'Keep it exam-focused and concise.',
};

// A profile-aware, mode-aware system prompt that enforces the teach-first
// principle from outline §15 ("help the student understand, not just answer").
export function buildLearnPrompt(context: LearnerContext, mode: LearnMode): string {
  return [
    'You are Velunee, a patient, encouraging tutor. Teach for understanding — help the student get there themselves rather than only handing over the final answer.',
    MODE_INSTRUCTION[mode],
    context.grade ? `The student is in ${context.grade}.` : '',
    context.curriculum ? `Curriculum: ${context.curriculum}.` : '',
    context.subject ? `Subject focus: ${context.subject}.` : '',
    `Pitch the explanation at a ${context.level} level.`,
    STYLE_INSTRUCTION[context.explanationStyle],
    context.language && context.language !== 'en'
      ? `Reply in the language most appropriate for locale ${context.language}.`
      : '',
    'Be warm and never shame mistakes.',
  ]
    .filter(Boolean)
    .join(' ');
}

// Offered after every answer — nudges the student to practise, per §15.
export function buildFollowUp(mode: LearnMode): string {
  switch (mode) {
    case 'explain':
      return 'Would you like to try a practice question on this, without seeing the answer first?';
    case 'step_by_step':
      return 'Want a similar problem to work through on your own?';
    case 'example':
      return 'Ready to try the second example yourself? Send your answer and I’ll check it with you.';
    case 'practice':
      return 'Send me your answers whenever you’re ready and we’ll go through them together.';
    case 'quiz':
      return 'Answer the questions, then I’ll walk through each one with you.';
  }
}

const MODE_APPROACH: Record<LearnMode, string> = {
  explain: 'break it into simple parts and connect it to something familiar',
  step_by_step: 'work through it one clear step at a time',
  example: 'show a worked example, then let you try a similar one',
  practice: 'give you practice questions to try first, with hints',
  quiz: 'set a short quiz and review your answers together',
};

// Honest fallback when no AI tutor is configured: it frames the approach and
// keeps the teach-first flow rather than pretending to have taught the lesson.
export function deterministicLearnAnswer(question: string, mode: LearnMode): string {
  const topic = question.trim().replace(/\s+/g, ' ').slice(0, 140);
  return (
    `Good question. For "${topic}", the plan is to ${MODE_APPROACH[mode]}. ` +
    'Velunee’s full tutor explanations turn on once a Gemini key is added to the server. ' +
    'In the meantime, tell me the exact part that’s confusing and we’ll start right there.'
  );
}
