import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CommunityPost, ReportReason } from '@velunee/contracts';

import { useBlockPostAuthor, useReportPost } from '@/features/community/use-community';
import { colors } from '@/theme/colors';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

interface CommunityPostCardProps {
  post: CommunityPost;
  onToggleReaction: (post: CommunityPost) => void;
}

export function CommunityPostCard({
  post,
  onToggleReaction,
}: CommunityPostCardProps): React.JSX.Element {
  const initial = post.authorName.replace('@', '').charAt(0) || 'V';
  const reportPost = useReportPost();
  const blockAuthor = useBlockPostAuthor();

  function submitReport(reason: ReportReason): void {
    reportPost.mutate(
      { postId: post.id, reason },
      {
        onSuccess: () =>
          Alert.alert('Thanks for reporting', 'Our team will take a look at this post.'),
        onError: (error) =>
          Alert.alert('Could not report', error instanceof Error ? error.message : 'Try again.'),
      },
    );
  }

  function openReportReasons(): void {
    Alert.alert('Why are you reporting this?', undefined, [
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
      { text: 'Something else', onPress: () => submitReport('other') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmBlock(): void {
    Alert.alert('Block this person?', "You won't see their posts, and they won't see yours.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => blockAuthor.mutate(post.id) },
    ]);
  }

  function openMenu(): void {
    Alert.alert('Post options', undefined, [
      { text: 'Report post', onPress: openReportReasons },
      { text: 'Block this person', style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial.toUpperCase()}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.author} numberOfLines={1}>
            {post.authorName}
            {post.isOwnPost ? ' · You' : ''}
          </Text>
          <Text style={styles.time}>{relativeTime(post.createdAt)}</Text>
        </View>
        {post.isOwnPost ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post options"
            hitSlop={10}
            onPress={openMenu}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <Text style={styles.caption}>{post.caption}</Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.viewerHasReacted ? 'Remove heart' : 'Add heart'}
          accessibilityState={{ selected: post.viewerHasReacted }}
          hitSlop={8}
          onPress={() => onToggleReaction(post)}
          style={styles.reaction}
        >
          <Ionicons
            name={post.viewerHasReacted ? 'heart' : 'heart-outline'}
            size={22}
            color={post.viewerHasReacted ? colors.danger : colors.textSecondary}
          />
          <Text
            style={[
              styles.reactionCount,
              post.viewerHasReacted ? styles.reactionCountActive : null,
            ]}
          >
            {post.reactionCount}
          </Text>
        </Pressable>

        <View style={styles.reaction}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.reactionCount}>{post.commentCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  author: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  caption: {
    marginTop: 14,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 16,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  reactionCountActive: {
    color: colors.danger,
  },
});
