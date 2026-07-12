import { Inject, Injectable } from '@nestjs/common';
import type {
  CommunityFeedResponse,
  CommunityPost,
  ReactionKind,
  ReactionState,
} from '@velunee/contracts';
import {
  comments,
  posts,
  profiles,
  publicProfiles,
  reactions,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import { and, count, desc, eq, isNull, lt } from 'drizzle-orm';
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
  ): Promise<CommunityPost> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }
    await this.ensureUser(userId);
    const { db } = this.connection;

    const id = randomUUID();
    // Auto-approve for MVP; a moderation pipeline can gate this later.
    const [row] = await db
      .insert(posts)
      .values({
        id,
        userId,
        caption,
        visibility: 'public',
        moderationStatus: 'approved',
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
      nameRow?.displayName?.trim() ||
      (authorHandle ? `@${authorHandle}` : 'Velunee member');

    return { authorName, authorHandle };
  }

  async getFeed(
    userId: string,
    cursor?: string,
  ): Promise<CommunityFeedResponse> {
    if (!this.connection) {
      return { posts: [], nextCursor: null };
    }
    const { db } = this.connection;

    const conditions = [
      eq(posts.moderationStatus, 'approved'),
      isNull(posts.deletedAt),
    ];
    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)));
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
        const [author, reactionCount, commentCount, viewer] =
          await Promise.all([
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
      .where(
        and(eq(comments.postId, postId), isNull(comments.deletedAt)),
      );
    return row?.value ?? 0;
  }

  private async viewerReacted(
    postId: string,
    userId: string,
  ): Promise<boolean> {
    if (!this.connection) return false;
    const [row] = await this.connection.db
      .select({ id: reactions.id })
      .from(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, userId),
        ),
      )
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

  async addReaction(
    userId: string,
    postId: string,
    type: ReactionKind,
  ): Promise<ReactionState> {
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

  async removeReaction(
    userId: string,
    postId: string,
    type: ReactionKind,
  ): Promise<ReactionState> {
    if (!this.connection) {
      throw new Error('Community persistence is not configured');
    }

    await this.connection.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, userId),
          eq(reactions.type, type),
        ),
      );

    return this.reactionState(postId, userId);
  }

  private async reactionState(
    postId: string,
    userId: string,
  ): Promise<ReactionState> {
    const [reactionCount, viewerHasReacted] = await Promise.all([
      this.countReactions(postId),
      this.viewerReacted(postId, userId),
    ]);
    return { postId, reactionCount, viewerHasReacted };
  }
}
