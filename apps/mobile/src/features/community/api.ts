import {
  communityFeedResponseSchema,
  createPostResponseSchema,
  reactionStateSchema,
  type CommunityFeedResponse,
  type CreatePostResponse,
  type ReactionKind,
  type ReactionState,
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
