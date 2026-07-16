import {
  buildFollowUp,
  buildLearnPrompt,
  deterministicLearnAnswer,
  type LearnerContext,
} from './learn.logic';

function ctx(overrides: Partial<LearnerContext> = {}): LearnerContext {
  return {
    country: 'Bangladesh',
    curriculum: 'National Curriculum',
    grade: 'Class 6',
    subject: 'Science',
    language: 'en',
    level: 'beginner',
    explanationStyle: 'simple',
    ...overrides,
  };
}

describe('buildLearnPrompt', () => {
  it('enforces teaching for understanding and includes the learner profile', () => {
    const prompt = buildLearnPrompt(ctx(), 'explain');
    expect(prompt.toLowerCase()).toContain('teach for understanding');
    expect(prompt).toContain('Class 6');
    expect(prompt).toContain('National Curriculum');
    expect(prompt).toContain('beginner');
  });

  it('withholds the answer for practice mode', () => {
    const prompt = buildLearnPrompt(ctx(), 'practice');
    expect(prompt).toContain('Do NOT give the final answer first');
  });

  it('asks for a reply in the learner language when not English', () => {
    const prompt = buildLearnPrompt(ctx({ language: 'bn' }), 'explain');
    expect(prompt).toContain('bn');
  });
});

describe('buildFollowUp', () => {
  it('always nudges the learner to practise', () => {
    expect(buildFollowUp('explain')).toMatch(/practice question/i);
    expect(buildFollowUp('quiz')).toMatch(/answer/i);
    expect(buildFollowUp('example')).toMatch(/try/i);
  });
});

describe('deterministicLearnAnswer', () => {
  it('is honest about needing the AI tutor and never fabricates a lesson', () => {
    const answer = deterministicLearnAnswer('Explain photosynthesis', 'explain');
    expect(answer).toContain('photosynthesis');
    expect(answer.toLowerCase()).toContain('gemini');
    expect(answer.length).toBeGreaterThan(0);
  });

  it('reflects the chosen mode approach', () => {
    expect(deterministicLearnAnswer('Solve 2x+3=7', 'step_by_step')).toContain('one clear step');
  });
});
