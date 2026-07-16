import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AIProvider } from '@velunee/ai-core';
import type {
  CreateStudyTopicInput,
  LearnAskRequestInput,
  LearnAskResponse,
  LearnDeletedResponse,
  LearnerProfile,
  LearnerProfileResponse,
  StudyTopic,
  StudyTopicResponse,
  StudyTopicsResponse,
  UpdateLearnerProfileInput,
  UpdateStudyTopicStatusInput,
} from '@velunee/contracts';
import { randomUUID } from 'node:crypto';
import { AI_PROVIDER } from '../chat/chat.constants';
import {
  buildFollowUp,
  buildLearnPrompt,
  deterministicLearnAnswer,
  type LearnerContext,
} from './learn.logic';
import { LearnRepository, type LearnerProfileRow, type StudyTopicRow } from './learn.repository';

const DEFAULT_PROFILE: LearnerProfileRow = {
  country: null,
  curriculum: null,
  grade: null,
  subject: null,
  language: 'en',
  level: 'beginner',
  explanationStyle: 'simple',
  examDate: null,
  configuredAt: null,
};

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class LearnService {
  private readonly logger = new Logger(LearnService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
    private readonly repository: LearnRepository,
  ) {}

  private async profileOrDefault(userId: string): Promise<LearnerProfileRow> {
    return (await this.repository.getProfile(userId)) ?? DEFAULT_PROFILE;
  }

  private toProfileContract(row: LearnerProfileRow): LearnerProfile {
    return {
      country: row.country,
      curriculum: row.curriculum,
      grade: row.grade,
      subject: row.subject,
      language: row.language,
      level: row.level,
      explanationStyle: row.explanationStyle,
      examDate: row.examDate,
      isConfigured: row.configuredAt !== null,
    };
  }

  async getProfile(userId: string): Promise<LearnerProfileResponse> {
    const row = await this.profileOrDefault(userId);
    return { profile: this.toProfileContract(row) };
  }

  async updateProfile(
    userId: string,
    input: UpdateLearnerProfileInput,
  ): Promise<LearnerProfileResponse> {
    const patch: Partial<Omit<LearnerProfileRow, 'configuredAt'>> = {};
    if (input.country !== undefined) patch.country = input.country?.length ? input.country : null;
    if (input.curriculum !== undefined)
      patch.curriculum = input.curriculum?.length ? input.curriculum : null;
    if (input.grade !== undefined) patch.grade = input.grade?.length ? input.grade : null;
    if (input.subject !== undefined) patch.subject = input.subject?.length ? input.subject : null;
    if (input.language !== undefined) patch.language = input.language;
    if (input.level !== undefined) patch.level = input.level;
    if (input.explanationStyle !== undefined) patch.explanationStyle = input.explanationStyle;
    if (input.examDate !== undefined) patch.examDate = input.examDate ?? null;

    await this.repository.upsertProfile(userId, patch);
    return this.getProfile(userId);
  }

  async ask(userId: string, input: LearnAskRequestInput): Promise<LearnAskResponse> {
    const requestId = randomUUID();
    const profile = await this.profileOrDefault(userId);
    const context: LearnerContext = {
      country: profile.country,
      curriculum: profile.curriculum,
      grade: profile.grade,
      subject: profile.subject,
      language: profile.language,
      level: profile.level,
      explanationStyle: profile.explanationStyle,
    };

    let answer = deterministicLearnAnswer(input.question, input.mode);
    let provider = 'velunee';
    let model = 'deterministic';

    if (this.ai.name !== 'mock') {
      try {
        const result = await this.ai.generate({
          userId,
          requestId,
          locale: profile.language,
          context: buildLearnPrompt(context, input.mode),
          messages: [{ role: 'user', content: input.question }],
        });
        if (result.text.trim().length > 0) {
          answer = result.text.trim();
          provider = result.provider;
          model = result.model;
        }
      } catch (error) {
        this.logger.warn(
          `Learn AI unavailable, using deterministic guidance: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    return {
      mode: input.mode,
      answer,
      followUp: buildFollowUp(input.mode),
      provider,
      model,
      requestId,
    };
  }

  private toTopicContract(row: StudyTopicRow): StudyTopic {
    return {
      id: row.id,
      subject: row.subject,
      topic: row.topic,
      status: row.status,
      note: row.note,
      lastReviewedOn: row.lastReviewedOn,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listTopics(userId: string): Promise<StudyTopicsResponse> {
    const rows = await this.repository.listTopics(userId);
    return { topics: rows.map((row) => this.toTopicContract(row)) };
  }

  async createTopic(userId: string, input: CreateStudyTopicInput): Promise<StudyTopicResponse> {
    const row = await this.repository.createTopic(userId, {
      subject: input.subject,
      topic: input.topic,
      note: input.note?.length ? input.note : null,
    });
    return { topic: this.toTopicContract(row) };
  }

  async updateTopicStatus(
    userId: string,
    topicId: string,
    input: UpdateStudyTopicStatusInput,
  ): Promise<StudyTopicResponse> {
    const row = await this.repository.updateStatus(userId, topicId, input.status, isoToday());
    if (!row) throw new NotFoundException('Study topic not found');
    return { topic: this.toTopicContract(row) };
  }

  async deleteTopic(userId: string, topicId: string): Promise<LearnDeletedResponse> {
    const deleted = await this.repository.softDeleteTopic(userId, topicId);
    if (!deleted) throw new NotFoundException('Study topic not found');
    return { deleted: true };
  }
}
