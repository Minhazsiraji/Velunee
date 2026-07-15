import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MemoryFeature, MemoryItem, MemoryType } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import {
  useClearAllMemories,
  useCreateMemory,
  useDeleteMemory,
  useMemories,
  useUpdateMemory,
} from '@/features/memory/use-memory';
import { colors } from '@/theme/colors';

const TYPE_LABELS: Record<MemoryType, string> = {
  preference: 'Preference',
  goal: 'Goal',
  routine: 'Routine',
  project: 'Project',
  person: 'Person',
  date: 'Important date',
  communication: 'Communication',
  temporary: 'Temporary',
};

const FEATURE_LABELS: Record<MemoryFeature, string> = {
  chat: 'Chat',
  home: 'Home & Daily Brief',
  balance: 'Balance',
  style: 'Style',
  learn: 'Learn',
};

export default function MemoryVaultScreen(): React.JSX.Element {
  const router = useRouter();
  const memories = useMemories();
  const clearAll = useClearAllMemories();
  const [addVisible, setAddVisible] = useState(false);

  function confirmClearAll(): void {
    Alert.alert(
      'Delete all memories?',
      'Velunee will forget everything it has remembered about you. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => clearAll.mutate(),
        },
      ],
    );
  }

  function renderBody(): React.JSX.Element {
    if (memories.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      );
    }

    if (memories.isError || !memories.data) {
      return (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Couldn&apos;t load your memories</Text>
          <Text style={styles.stateBody}>Check your connection and try again.</Text>
          <PrimaryButton
            label="Retry"
            variant="outline"
            onPress={() => void memories.refetch()}
            style={styles.retry}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={memories.data.memories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemoryCard memory={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={memories.isRefetching}
        onRefresh={() => void memories.refetch()}
        ListHeaderComponent={
          <Text style={styles.explainer}>
            Everything Velunee remembers about you lives here. You can edit, pause, or delete any
            memory, and choose which parts of the app may use it. Memories are never shared with the
            community.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="bulb-outline" size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Nothing remembered yet</Text>
            <Text style={styles.stateBody}>
              Add something you&apos;d like Velunee to keep in mind — a preference, a goal, or a
              routine — and future answers will use it.
            </Text>
          </View>
        }
        ListFooterComponent={
          memories.data.memories.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={confirmClearAll} style={styles.clearAll}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.clearAllText}>Delete all memories</Text>
            </Pressable>
          ) : null
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Memory Vault</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a memory"
          hitSlop={10}
          onPress={() => setAddVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      {renderBody()}

      <AddMemoryModal visible={addVisible} onClose={() => setAddVisible(false)} />
    </SafeAreaView>
  );
}

function MemoryCard({ memory }: { memory: MemoryItem }): React.JSX.Element {
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();
  const [expanded, setExpanded] = useState(false);

  function toggleFeature(feature: MemoryFeature): void {
    const has = memory.allowedFeatures.includes(feature);
    const next = has
      ? memory.allowedFeatures.filter((item) => item !== feature)
      : [...memory.allowedFeatures, feature];
    if (next.length === 0) return; // at least one feature must remain
    updateMemory.mutate({ memoryId: memory.id, patch: { allowedFeatures: next } });
  }

  function confirmDelete(): void {
    Alert.alert('Delete this memory?', 'Velunee will forget it permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMemory.mutate(memory.id),
      },
    ]);
  }

  return (
    <View style={[styles.card, !memory.enabled && styles.cardPaused]}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardType}>{TYPE_LABELS[memory.type]}</Text>
          {memory.source === 'chat' ? <Text style={styles.cardSource}>From chat</Text> : null}
          {!memory.enabled ? <Text style={styles.cardPausedLabel}>Paused</Text> : null}
        </View>
        <Text style={styles.cardContent}>{memory.content}</Text>
        <Text style={styles.cardMeta}>
          {memory.lastUsedAt
            ? `Last used ${new Date(memory.lastUsedAt).toLocaleDateString()}`
            : 'Not used yet'}
          {memory.expiresAt
            ? ` · Forgets on ${new Date(memory.expiresAt).toLocaleDateString()}`
            : ''}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.cardControls}>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Use this memory</Text>
            <Switch
              value={memory.enabled}
              onValueChange={(value) =>
                updateMemory.mutate({ memoryId: memory.id, patch: { enabled: value } })
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <Text style={styles.controlHint}>Allowed in:</Text>
          <View style={styles.featureRow}>
            {(Object.keys(FEATURE_LABELS) as MemoryFeature[]).map((feature) => {
              const active = memory.allowedFeatures.includes(feature);
              return (
                <Pressable
                  key={feature}
                  accessibilityRole="button"
                  onPress={() => toggleFeature(feature)}
                  style={[styles.featureChip, active && styles.featureChipActive]}
                >
                  <Text style={[styles.featureChipText, active && styles.featureChipTextActive]}>
                    {FEATURE_LABELS[feature]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteRow}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.deleteText}>Delete memory</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function AddMemoryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const createMemory = useCreateMemory();
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryType>('preference');

  async function handleSave(): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      await createMemory.mutateAsync({ type, content: trimmed });
      setContent('');
      setType('preference');
      onClose();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Remember this</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.typeRow}>
            {(Object.keys(TYPE_LABELS) as MemoryType[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setType(key)}
                style={[styles.featureChip, type === key && styles.featureChipActive]}
              >
                <Text
                  style={[styles.featureChipText, type === key && styles.featureChipTextActive]}
                >
                  {TYPE_LABELS[key]}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="e.g. I prefer simple office outfits"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={600}
            style={styles.input}
          />

          {type === 'temporary' ? (
            <Text style={styles.modalHint}>Temporary memories are forgotten after 7 days.</Text>
          ) : null}

          <PrimaryButton
            label="Save memory"
            onPress={() => void handleSave()}
            isLoading={createMemory.isPending}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retry: {
    marginTop: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  explainer: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  cardPaused: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardType: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSource: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardPausedLabel: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardControls: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 10,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    color: colors.text,
    fontSize: 14,
  },
  controlHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featureChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  featureChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  featureChipTextActive: {
    color: colors.white,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  clearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  clearAllText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 6, 20, 0.7)',
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  saveButton: {
    marginTop: 4,
  },
});
