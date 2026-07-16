import { Inject, Injectable } from '@nestjs/common';
import type { ExplanationStyle, LearnerLevel, StudyStatus } from '@velunee/contracts';
import { learnerProfiles, studyTopics, users, type DatabaseConnection } from '@velunee/database';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface LearnerProfileRow {
  country: string | null;
  curriculum: string | null;
  grade: string | null;
  subject: string | null;
  language: string;
  level: LearnerLevel;
  explanationStyle: ExplanationStyle;
  examDate: string | null;
  configuredAt: Date | null;
}

export interface StudyTopicRow {
  id: string;
  subject: string;
  topic: string;
  status: StudyStatus;
  note: string | null;
  lastReviewedOn: string | null;
  createdAt: Date;
}

const NOT_CONFIGURED = 'Learn persistence is not configured';

@Injectable()
export class LearnRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  private async ensureUser(userId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .insert(users)
      .values({ id: userId, authProviderId: userId })
      .onConflictDoNothing();
  }

  async getProfile(userId: string): Promise<LearnerProfileRow | null> {
    if (!this.connection) return null;
    const [row] = await this.connection.db
      .select({
        country: learnerProfiles.country,
        curriculum: learnerProfiles.curriculum,
        grade: learnerProfiles.grade,
        subject: learnerProfiles.subject,
        language: learnerProfiles.language,
        level: learnerProfiles.level,
        explanationStyle: learnerProfiles.explanationStyle,
        examDate: learnerProfiles.examDate,
        configuredAt: learnerProfiles.configuredAt,
      })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, userId))
      .limit(1);
    if (!row) return null;
    return {
      ...row,
      level: row.level as LearnerLevel,
      explanationStyle: row.explanationStyle as ExplanationStyle,
    };
  }

  async upsertProfile(
    userId: string,
    patch: Partial<Omit<LearnerProfileRow, 'configuredAt'>>,
  ): Promise<void> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    await this.ensureUser(userId);
    const now = new Date();
    await this.connection.db
      .insert(learnerProfiles)
      .values({ userId, ...patch, configuredAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: learnerProfiles.userId,
        set: { ...patch, configuredAt: now, updatedAt: now },
      });
  }

  async listTopics(userId: string): Promise<StudyTopicRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({
        id: studyTopics.id,
        subject: studyTopics.subject,
        topic: studyTopics.topic,
        status: studyTopics.status,
        note: studyTopics.note,
        lastReviewedOn: studyTopics.lastReviewedOn,
        createdAt: studyTopics.createdAt,
      })
      .from(studyTopics)
      .where(and(eq(studyTopics.userId, userId), isNull(studyTopics.deletedAt)))
      .orderBy(desc(studyTopics.createdAt));
    return rows.map((row) => ({ ...row, status: row.status as StudyStatus }));
  }

  async createTopic(
    userId: string,
    input: { subject: string; topic: string; note: string | null },
  ): Promise<StudyTopicRow> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(studyTopics)
      .values({ userId, ...input })
      .returning({
        id: studyTopics.id,
        subject: studyTopics.subject,
        topic: studyTopics.topic,
        status: studyTopics.status,
        note: studyTopics.note,
        lastReviewedOn: studyTopics.lastReviewedOn,
        createdAt: studyTopics.createdAt,
      });
    if (!row) throw new Error('Study topic could not be saved');
    return { ...row, status: row.status as StudyStatus };
  }

  async updateStatus(
    userId: string,
    topicId: string,
    status: StudyStatus,
    reviewedOn: string,
  ): Promise<StudyTopicRow | null> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const [row] = await this.connection.db
      .update(studyTopics)
      .set({ status, lastReviewedOn: reviewedOn })
      .where(
        and(
          eq(studyTopics.id, topicId),
          eq(studyTopics.userId, userId),
          isNull(studyTopics.deletedAt),
        ),
      )
      .returning({
        id: studyTopics.id,
        subject: studyTopics.subject,
        topic: studyTopics.topic,
        status: studyTopics.status,
        note: studyTopics.note,
        lastReviewedOn: studyTopics.lastReviewedOn,
        createdAt: studyTopics.createdAt,
      });
    return row ? { ...row, status: row.status as StudyStatus } : null;
  }

  async softDeleteTopic(userId: string, topicId: string): Promise<boolean> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const updated = await this.connection.db
      .update(studyTopics)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(studyTopics.id, topicId),
          eq(studyTopics.userId, userId),
          isNull(studyTopics.deletedAt),
        ),
      )
      .returning({ id: studyTopics.id });
    return updated.length > 0;
  }
}
