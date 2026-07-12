import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CommunityPost } from '@velunee/contracts';

import { CommunityPostCard } from '@/components/community-post-card';
import { PrimaryButton } from '@/components/primary-button';
import {
  useCommunityFeed,
  useCreatePost,
  useToggleReaction,
} from '@/features/community/use-community';
import { colors } from '@/theme/colors';

export default function CommunityScreen(): React.JSX.Element {
  const feed = useCommunityFeed();
  const createPost = useCreatePost();
  const toggleReaction = useToggleReaction();

  const [composerVisible, setComposerVisible] = useState(false);
  const [caption, setCaption] = useState('');

  const posts = feed.data?.pages.flatMap((page) => page.posts) ?? [];

  async function handlePublish(): Promise<void> {
    const trimmed = caption.trim();
    if (!trimmed) return;
    try {
      await createPost.mutateAsync(trimmed);
      setCaption('');
      setComposerVisible(false);
    } catch {
      // Surface stays open; error shown inline below.
    }
  }

  function renderBody(): React.JSX.Element {
    if (feed.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      );
    }

    if (feed.isError) {
      return (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Couldn&apos;t load the community</Text>
          <Text style={styles.stateBody}>Check your connection and try again.</Text>
          <PrimaryButton
            label="Retry"
            variant="outline"
            onPress={() => void feed.refetch()}
            style={styles.retry}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: CommunityPost }) => (
          <CommunityPostCard post={item} onToggleReaction={(post) => toggleReaction.mutate(post)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={feed.isRefetching}
        onRefresh={() => void feed.refetch()}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) {
            void feed.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="people-outline" size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Be the first to share</Text>
            <Text style={styles.stateBody}>
              Post a thought, question, or a bit of inspiration for the Velunee community.
            </Text>
          </View>
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primaryLight} style={styles.footerLoader} />
          ) : null
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create post"
          hitSlop={10}
          onPress={() => setComposerVisible(true)}
          style={styles.composeButton}
        >
          <Ionicons name="create-outline" size={22} color={colors.white} />
        </Pressable>
      </View>

      {renderBody()}

      <Modal
        visible={composerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComposerVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New post</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={() => setComposerVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Share something with the community…"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primaryLight}
              multiline
              maxLength={2200}
              style={styles.input}
              autoFocus
            />

            {createPost.isError ? (
              <Text style={styles.inlineError}>
                Couldn&apos;t publish your post. Please try again.
              </Text>
            ) : null}

            <PrimaryButton
              label="Publish"
              onPress={() => void handlePublish()}
              isLoading={createPost.isPending}
              disabled={!caption.trim()}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    flexGrow: 1,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  stateTitle: {
    marginTop: 16,
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  retry: {
    marginTop: 20,
    width: 160,
  },
  footerLoader: {
    marginVertical: 20,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6, 4, 14, 0.6)',
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  input: {
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  inlineError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
});
