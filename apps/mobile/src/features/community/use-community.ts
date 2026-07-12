import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { CommunityFeedResponse, CommunityPost } from '@velunee/contracts';

import { addReaction, createPost, loadFeed, removeReaction } from './api';

const feedQueryKey = ['community', 'feed'] as const;

type FeedData = InfiniteData<CommunityFeedResponse>;

export function useCommunityFeed() {
  return useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => loadFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

function mapPosts(
  data: FeedData | undefined,
  postId: string,
  update: (post: CommunityPost) => CommunityPost,
): FeedData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === postId ? update(post) : post)),
    })),
  };
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (caption: string) => createPost(caption),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (post: CommunityPost) =>
      post.viewerHasReacted ? removeReaction(post.id) : addReaction(post.id),
    onMutate: async (post: CommunityPost) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey });
      const previous = queryClient.getQueryData<FeedData>(feedQueryKey);

      queryClient.setQueryData<FeedData>(feedQueryKey, (data) =>
        mapPosts(data, post.id, (current) => ({
          ...current,
          viewerHasReacted: !current.viewerHasReacted,
          reactionCount: current.viewerHasReacted
            ? Math.max(0, current.reactionCount - 1)
            : current.reactionCount + 1,
        })),
      );

      return { previous };
    },
    onError: (_error, _post, context) => {
      if (context?.previous) {
        queryClient.setQueryData(feedQueryKey, context.previous);
      }
    },
    onSuccess: (state) => {
      queryClient.setQueryData<FeedData>(feedQueryKey, (data) =>
        mapPosts(data, state.postId, (current) => ({
          ...current,
          viewerHasReacted: state.viewerHasReacted,
          reactionCount: state.reactionCount,
        })),
      );
    },
  });
}
