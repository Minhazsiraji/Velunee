import {
  blockedUsersResponseSchema,
  blockResponseSchema,
  communityFeedResponseSchema,
  createPostResponseSchema,
  reactionStateSchema,
  reportResponseSchema,
  type BlockedUsersResponse,
  type BlockResponse,
  type CommunityFeedResponse,
  type CreatePostResponse,
  type ReactionKind,
  type ReactionState,
  type ReportReason,
  type ReportResponse,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadFeed(cursor?: string): Promise<CommunityFeedResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const payload = await apiRequest<unknown>(`/community/feed${query}`);
  return communityFeedResponseSchema.parse(payload);
}

export async function createPost(caption: string): Promise<CreatePostResponse> {
  const payload = await apiRequest<unknown>('/community/posts', {
    method: 'POST',
    body: JSON.stringify({ caption }),
  });
  return createPostResponseSchema.parse(payload);
}

export async function addReaction(
  postId: string,
  type: ReactionKind = 'heart',
): Promise<ReactionState> {
  const payload = await apiRequest<unknown>(`/community/posts/${postId}/reactions?type=${type}`, {
    method: 'POST',
  });
  return reactionStateSchema.parse(payload);
}

export async function removeReaction(
  postId: string,
  type: ReactionKind = 'heart',
): Promise<ReactionState> {
  const payload = await apiRequest<unknown>(`/community/posts/${postId}/reactions?type=${type}`, {
    method: 'DELETE',
  });
  return reactionStateSchema.parse(payload);
}

export async function reportPost(postId: string, reason: ReportReason): Promise<ReportResponse> {
  const payload = await apiRequest<unknown>(`/community/posts/${postId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return reportResponseSchema.parse(payload);
}

export async function blockPostAuthor(postId: string): Promise<BlockResponse> {
  const payload = await apiRequest<unknown>(`/community/posts/${postId}/block-author`, {
    method: 'POST',
  });
  return blockResponseSchema.parse(payload);
}

export async function loadBlocked(): Promise<BlockedUsersResponse> {
  const payload = await apiRequest<unknown>('/community/blocks');
  return blockedUsersResponseSchema.parse(payload);
}

export async function unblockUser(userId: string): Promise<BlockResponse> {
  const payload = await apiRequest<unknown>(`/community/users/${userId}/block`, {
    method: 'DELETE',
  });
  return blockResponseSchema.parse(payload);
}
