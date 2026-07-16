import { Inject, Injectable } from '@nestjs/common';
import type {
  CommunityFeedResponse,
  CommunityPost,
  ModerationQueueItem,
  ReactionKind,
  ReactionState,
} from '@velunee/contracts';
import type { ModerationResult } from '@velunee/moderation-core';
import {
  blocks,
  comments,
  contentChecks,
  posts,
  profiles,
  publicProfiles,
  reactions,
  reports,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import { and, count, desc, eq, inArray, isNull, lt, notInArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DATABASE_CONNECTION } from '../database/database.constants';

const FEED_PAGE_SIZE = 20;

@Injectable()
export class CommunityRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  get enabled(): boolean {
    return this.connection !== null;
  }

  private async ensureUser(userId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .insert(users)
      .values({ id: userId, authProviderId: userId })
      .onConflictDoNothing();
  }

  async createPost(
    userId: string,
    caption: string,
    moderationStatus: 'approved' | 'review',
  ): Promise<CommunityPost> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }
    await this.ensureUser(userId);
    const { db } = this.connection;

    const id = randomUUID();
    const [row] = await db
      .insert(posts)
      .values({
        id,
        userId,
        caption,
        visibility: 'public',
        moderationStatus,
      })
      .returning({ createdAt: posts.createdAt });

    const author = await this.getAuthor(userId);

    return {
      id,
      authorName: author.authorName,
      authorHandle: author.authorHandle,
      caption,
      isOwnPost: true,
      reactionCount: 0,
      viewerHasReacted: false,
      commentCount: 0,
      createdAt: (row?.createdAt ?? new Date()).toISOString(),
    };
  }

  private async getAuthor(userId: string): Promise<{
    authorName: string;
    authorHandle: string | null;
  }> {
    if (!this.connection) {
      return { authorName: 'Velunee member', authorHandle: null };
    }
    const { db } = this.connection;

    const [handleRow] = await db
      .select({ handle: publicProfiles.handle })
      .from(publicProfiles)
      .where(eq(publicProfiles.userId, userId))
      .limit(1);

    const [nameRow] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const authorHandle = handleRow?.handle ?? null;
    const authorName =
      nameRow?.displayName?.trim() || (authorHandle ? `@${authorHandle}` : 'Velunee member');

    return { authorName, authorHandle };
  }

  async getFeed(userId: string, cursor?: string): Promise<CommunityFeedResponse> {
    if (!this.connection) {
      return { posts: [], nextCursor: null };
    }
    const { db } = this.connection;

    const hidden = await this.getHiddenAuthorIds(userId);

    const conditions = [eq(posts.moderationStatus, 'approved'), isNull(posts.deletedAt)];
    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)));
    }
    if (hidden.length > 0) {
      conditions.push(notInArray(posts.userId, hidden));
    }

    const rows = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        caption: posts.caption,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(FEED_PAGE_SIZE + 1);

    const hasMore = rows.length > FEED_PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;

    const feedPosts = await Promise.all(
      pageRows.map(async (row) => {
        const [author, reactionCount, commentCount, viewer] = await Promise.all([
          this.getAuthor(row.userId),
          this.countReactions(row.id),
          this.countComments(row.id),
          this.viewerReacted(row.id, userId),
        ]);

        return {
          id: row.id,
          authorName: author.authorName,
          authorHandle: author.authorHandle,
          caption: row.caption ?? '',
          isOwnPost: row.userId === userId,
          reactionCount,
          viewerHasReacted: viewer,
          commentCount,
          createdAt: row.createdAt.toISOString(),
        } satisfies CommunityPost;
      }),
    );

    const nextCursor =
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1]!.createdAt.toISOString()
        : null;

    return { posts: feedPosts, nextCursor };
  }

  private async countReactions(postId: string): Promise<number> {
    if (!this.connection) return 0;
    const [row] = await this.connection.db
      .select({ value: count() })
      .from(reactions)
      .where(eq(reactions.postId, postId));
    return row?.value ?? 0;
  }

  private async countComments(postId: string): Promise<number> {
    if (!this.connection) return 0;
    const [row] = await this.connection.db
      .select({ value: count() })
      .from(comments)
      .where(and(eq(comments.postId, postId), isNull(comments.deletedAt)));
    return row?.value ?? 0;
  }

  private async viewerReacted(postId: string, userId: string): Promise<boolean> {
    if (!this.connection) return false;
    const [row] = await this.connection.db
      .select({ id: reactions.id })
      .from(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  async postExists(postId: string): Promise<boolean> {
    if (!this.connection) return false;
    const [row] = await this.connection.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);
    return Boolean(row);
  }

  async addReaction(userId: string, postId: string, type: ReactionKind): Promise<ReactionState> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }
    await this.ensureUser(userId);

    await this.connection.db
      .insert(reactions)
      .values({ postId, userId, type })
      .onConflictDoNothing();

    return this.reactionState(postId, userId);
  }

  async removeReaction(userId: string, postId: string, type: ReactionKind): Promise<ReactionState> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }

    await this.connection.db
      .delete(reactions)
      .where(
        and(eq(reactions.postId, postId), eq(reactions.userId, userId), eq(reactions.type, type)),
      );

    return this.reactionState(postId, userId);
  }

  private async reactionState(postId: string, userId: string): Promise<ReactionState> {
    const [reactionCount, viewerHasReacted] = await Promise.all([
      this.countReactions(postId),
      this.viewerReacted(postId, userId),
    ]);
    return { postId, reactionCount, viewerHasReacted };
  }

  async logContentCheck(subjectId: string, result: ModerationResult): Promise<void> {
    if (!this.connection) return;
    await this.connection.db.insert(contentChecks).values({
      subjectType: 'post',
      subjectId,
      provider: result.providerReference ?? 'heuristic',
      decision: result.decision,
      riskScore: result.riskScore,
      categories: result.categories,
    });
  }

  async getModerationQueue(): Promise<ModerationQueueItem[]> {
    if (!this.connection) return [];
    const { db } = this.connection;

    const rows = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        caption: posts.caption,
        moderationStatus: posts.moderationStatus,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(and(inArray(posts.moderationStatus, ['pending', 'review']), isNull(posts.deletedAt)))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    return Promise.all(
      rows.map(async (row) => {
        const [author, check] = await Promise.all([
          this.getAuthor(row.userId),
          this.latestContentCheck(row.id),
        ]);
        return {
          id: row.id,
          authorName: author.authorName,
          caption: row.caption ?? '',
          status: row.moderationStatus as 'pending' | 'review',
          categories: check?.categories ?? [],
          riskScore: check?.riskScore ?? 0,
          createdAt: row.createdAt.toISOString(),
        } satisfies ModerationQueueItem;
      }),
    );
  }

  private async latestContentCheck(
    subjectId: string,
  ): Promise<{ categories: string[]; riskScore: number } | null> {
    if (!this.connection) return null;
    const [row] = await this.connection.db
      .select({
        categories: contentChecks.categories,
        riskScore: contentChecks.riskScore,
      })
      .from(contentChecks)
      .where(and(eq(contentChecks.subjectType, 'post'), eq(contentChecks.subjectId, subjectId)))
      .orderBy(desc(contentChecks.createdAt))
      .limit(1);
    return row ?? null;
  }

  async setModerationStatus(postId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    if (!this.connection) return false;
    const updated = await this.connection.db
      .update(posts)
      .set({ moderationStatus: status, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .returning({ id: posts.id });
    return updated.length > 0;
  }

  // Posts hidden both ways: people the viewer blocked, and people who blocked
  // the viewer.
  async getHiddenAuthorIds(userId: string): Promise<string[]> {
    if (!this.connection) return [];
    const { db } = this.connection;

    const [iBlocked, blockedMe] = await Promise.all([
      db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId)),
      db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId)),
    ]);

    return [...new Set([...iBlocked, ...blockedMe].map((row) => row.id))];
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }
    await this.ensureUser(blockerId);
    await this.ensureUser(blockedId);
    await this.connection.db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
  }

  async listBlocked(
    blockerId: string,
  ): Promise<{ userId: string; name: string; blockedAt: string }[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({ blockedId: blocks.blockedId, createdAt: blocks.createdAt })
      .from(blocks)
      .where(eq(blocks.blockerId, blockerId))
      .orderBy(desc(blocks.createdAt));

    return Promise.all(
      rows.map(async (row) => {
        const author = await this.getAuthor(row.blockedId);
        return {
          userId: row.blockedId,
          name: author.authorName,
          blockedAt: row.createdAt.toISOString(),
        };
      }),
    );
  }

  async postAuthorId(postId: string): Promise<string | null> {
    if (!this.connection) return null;
    const [row] = await this.connection.db
      .select({ userId: posts.userId })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);
    return row?.userId ?? null;
  }

  // Records the report and returns how many distinct people have now reported
  // this post (used to decide when to send it to human review).
  async reportPost(
    reporterId: string,
    postId: string,
    reason: string,
    note: string | null,
  ): Promise<number> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }
    await this.ensureUser(reporterId);
    await this.connection.db
      .insert(reports)
      .values({ reporterId, postId, reason, note })
      .onConflictDoNothing();

    const [row] = await this.connection.db
      .select({ value: count() })
      .from(reports)
      .where(eq(reports.postId, postId));
    return row?.value ?? 0;
  }

  async flagForReview(postId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .update(posts)
      .set({ moderationStatus: 'review', updatedAt: new Date() })
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)));
  }
}
