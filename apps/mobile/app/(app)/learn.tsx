import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ExplanationStyle,
  LearnerLevel,
  LearnMode,
  StudyStatus,
  StudyTopic,
} from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import {
  useAskLearn,
  useCreateStudyTopic,
  useDeleteStudyTopic,
  useLearnerProfile,
  useStudyTopics,
  useUpdateLearnerProfile,
  useUpdateStudyTopicStatus,
} from '@/features/learn/use-learn';
import { colors } from '@/theme/colors';

const MODES: { value: LearnMode; label: string }[] = [
  { value: 'explain', label: 'Explain' },
  { value: 'step_by_step', label: 'Steps' },
  { value: 'example', label: 'Example' },
  { value: 'practice', label: 'Practice' },
  { value: 'quiz', label: 'Quiz' },
];
const LEVELS: LearnerLevel[] = ['beginner', 'intermediate', 'advanced'];
const STYLES: { value: ExplanationStyle; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'step_by_step', label: 'Step-by-step' },
  { value: 'exam_focused', label: 'Exam-focused' },
];
const STATUS_ORDER: StudyStatus[] = ['learning', 'reviewing', 'mastered'];
const STATUS_LABEL: Record<StudyStatus, string> = {
  learning: 'Learning',
  reviewing: 'Reviewing',
  mastered: 'Mastered',
};

interface LessonTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  followUp?: string | null;
}

function turnId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Chip({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </Pressable>
  );
}

export default function LearnScreen(): React.JSX.Element {
  const router = useRouter();
  const profile = useLearnerProfile();
  const ask = useAskLearn();
  const topics = useStudyTopics();

  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<LearnMode>('explain');
  const [profileVisible, setProfileVisible] = useState(false);
  const [topicVisible, setTopicVisible] = useState(false);
  const [turns, setTurns] = useState<LessonTurn[]>([]);

  const lastAssistantId =
    [...turns].reverse().find((turn) => turn.role === 'assistant')?.id ?? null;

  function send(text: string): void {
    const q = text.trim();
    if (!q || ask.isPending) return;
    const history = turns.map((turn) => ({ role: turn.role, content: turn.content })).slice(-20);
    setTurns((prev) => [...prev, { id: turnId(), role: 'user', content: q }]);
    setQuestion('');
    ask.mutate(
      { question: q, mode, history },
      {
        onSuccess: (data) => {
          setTurns((prev) => [
            ...prev,
            { id: turnId(), role: 'assistant', content: data.answer, followUp: data.followUp },
          ]);
        },
      },
    );
  }

  function startOver(): void {
    setTurns([]);
    ask.reset();
  }

  const grade = profile.data?.profile.grade;

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
        <Text style={styles.headerTitle}>Velunee Learn</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Learning profile"
          hitSlop={10}
          onPress={() => setProfileVisible(true)}
          style={styles.gearButton}
        >
          <Ionicons name="school-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ask any lesson</Text>
            <Text style={styles.cardHint}>
              {grade
                ? `Tuned for ${grade}. `
                : 'Set your grade and subject in the top-right for tailored help. '}
              Velunee teaches you to understand — it won’t just hand over answers.
            </Text>

            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={
                turns.length > 0 ? 'Reply, or ask something new' : 'e.g. Explain photosynthesis'
              }
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={600}
              style={styles.input}
            />

            <View style={styles.chipRow}>
              {MODES.map((m) => (
                <Chip
                  key={m.value}
                  text={m.label}
                  active={mode === m.value}
                  onPress={() => setMode(m.value)}
                />
              ))}
            </View>

            <PrimaryButton
              label={turns.length > 0 ? 'Send' : 'Teach me'}
              icon="school"
              onPress={() => send(question)}
              isLoading={ask.isPending}
              style={styles.askButton}
            />

            {ask.isError ? (
              <Text style={styles.errorText}>
                {ask.error instanceof Error ? ask.error.message : 'Please try again.'}
              </Text>
            ) : null}
          </View>

          {turns.length > 0 ? (
            <View style={styles.thread}>
              <View style={styles.threadHeader}>
                <Text style={styles.sectionTitle}>This lesson</Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={startOver}>
                  <Text style={styles.startOver}>Start over</Text>
                </Pressable>
              </View>

              {turns.map((turn) =>
                turn.role === 'user' ? (
                  <View key={turn.id} style={styles.userTurn}>
                    <Text style={styles.userTurnText}>{turn.content}</Text>
                  </View>
                ) : (
                  <View key={turn.id} style={styles.assistantTurn}>
                    <Text style={styles.answerText}>{turn.content}</Text>
                    {turn.followUp && turn.id === lastAssistantId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Continue with this suggestion"
                        android_ripple={{ color: 'rgba(180, 150, 255, 0.10)' }}
                        disabled={ask.isPending}
                        onPress={() => send(turn.followUp ?? '')}
                        style={styles.followUp}
                      >
                        <Ionicons
                          name="arrow-forward-circle"
                          size={18}
                          color={colors.primaryLight}
                        />
                        <Text style={styles.followUpText}>{turn.followUp}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ),
              )}

              {ask.isPending ? (
                <ActivityIndicator color={colors.primaryLight} style={styles.turnLoader} />
              ) : null}
            </View>
          ) : null}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My study topics</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add topic"
              hitSlop={10}
              onPress={() => setTopicVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primaryLight} />
            </Pressable>
          </View>

          {topics.isLoading ? (
            <ActivityIndicator color={colors.primaryLight} style={styles.loader} />
          ) : (topics.data?.topics.length ?? 0) === 0 ? (
            <Text style={styles.emptyText}>
              Add topics you’re studying and track each from Learning to Mastered.
            </Text>
          ) : (
            topics.data!.topics.map((topic) => <TopicRow key={topic.id} topic={topic} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
      <AddTopicModal visible={topicVisible} onClose={() => setTopicVisible(false)} />
    </SafeAreaView>
  );
}

function TopicRow({ topic }: { topic: StudyTopic }): React.JSX.Element {
  const updateStatus = useUpdateStudyTopicStatus();
  const deleteTopic = useDeleteStudyTopic();

  function cycleStatus(): void {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(topic.status) + 1) % STATUS_ORDER.length]!;
    updateStatus.mutate({ topicId: topic.id, status: next });
  }

  function confirmDelete(): void {
    Alert.alert('Remove topic', `Remove “${topic.topic}”?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteTopic.mutate(topic.id) },
    ]);
  }

  const statusStyle =
    topic.status === 'learning'
      ? styles.status_learning
      : topic.status === 'reviewing'
        ? styles.status_reviewing
        : styles.status_mastered;

  return (
    <View style={styles.topicRow}>
      <View style={styles.topicInfo}>
        <Text style={styles.topicName}>{topic.topic}</Text>
        <Text style={styles.topicSubject}>{topic.subject}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Status: ${STATUS_LABEL[topic.status]}, tap to change`}
        onPress={cycleStatus}
        style={[styles.statusChip, statusStyle]}
      >
        <Text style={styles.statusText}>{STATUS_LABEL[topic.status]}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${topic.topic}`}
        hitSlop={8}
        onPress={confirmDelete}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function ProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const profile = useLearnerProfile();
  const update = useUpdateLearnerProfile();
  const [grade, setGrade] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<LearnerLevel>('beginner');
  const [style, setStyle] = useState<ExplanationStyle>('simple');

  useEffect(() => {
    if (visible && profile.data) {
      setGrade(profile.data.profile.grade ?? '');
      setCurriculum(profile.data.profile.curriculum ?? '');
      setSubject(profile.data.profile.subject ?? '');
      setLevel(profile.data.profile.level);
      setStyle(profile.data.profile.explanationStyle);
    }
  }, [visible, profile.data]);

  async function save(): Promise<void> {
    try {
      await update.mutateAsync({
        grade: grade.trim() || null,
        curriculum: curriculum.trim() || null,
        subject: subject.trim() || null,
        level,
        explanationStyle: style,
      });
      onClose();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalCard}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Learning profile</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>GRADE / CLASS</Text>
          <TextInput
            value={grade}
            onChangeText={setGrade}
            placeholder="e.g. Class 6"
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
          />
          <Text style={styles.fieldLabel}>CURRICULUM (OPTIONAL)</Text>
          <TextInput
            value={curriculum}
            onChangeText={setCurriculum}
            placeholder="e.g. National Curriculum"
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
          />
          <Text style={styles.fieldLabel}>MAIN SUBJECT (OPTIONAL)</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Science"
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
          />

          <Text style={styles.fieldLabel}>LEVEL</Text>
          <View style={styles.chipRow}>
            {LEVELS.map((value) => (
              <Chip
                key={value}
                text={label(value)}
                active={level === value}
                onPress={() => setLevel(value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>EXPLANATION STYLE</Text>
          <View style={styles.chipRow}>
            {STYLES.map((s) => (
              <Chip
                key={s.value}
                text={s.label}
                active={style === s.value}
                onPress={() => setStyle(s.value)}
              />
            ))}
          </View>

          <PrimaryButton
            label="Save profile"
            onPress={() => void save()}
            isLoading={update.isPending}
            style={styles.modalSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddTopicModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const create = useCreateStudyTopic();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  async function save(): Promise<void> {
    const s = subject.trim();
    const t = topic.trim();
    if (!s || !t) return;
    try {
      await create.mutateAsync({ subject: s, topic: t });
      setSubject('');
      setTopic('');
      onClose();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
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
            <Text style={styles.modalTitle}>Add a study topic</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>SUBJECT</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Science"
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
          />
          <Text style={styles.fieldLabel}>TOPIC</Text>
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. Photosynthesis"
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
          />
          <PrimaryButton
            label="Add topic"
            onPress={() => void save()}
            isLoading={create.isPending}
            style={styles.modalSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' },
  gearButton: { backgroundColor: colors.primary, borderRadius: 18, padding: 7 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardHint: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  askButton: { marginTop: 2 },
  errorText: { color: colors.danger, fontSize: 13 },
  answerText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  followUpText: { flex: 1, color: colors.primaryLight, fontSize: 14, lineHeight: 20 },
  thread: { gap: 12 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startOver: { color: colors.primaryLight, fontSize: 13, fontWeight: '700' },
  userTurn: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userTurnText: { color: colors.white, fontSize: 14, lineHeight: 20 },
  assistantTurn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  turnLoader: { marginVertical: 8 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  loader: { marginVertical: 20 },
  emptyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  topicInfo: { flex: 1, gap: 2 },
  topicName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  topicSubject: { color: colors.textSecondary, fontSize: 12 },
  statusChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  status_learning: { backgroundColor: colors.surfaceElevated },
  status_reviewing: { backgroundColor: colors.primaryMuted },
  status_mastered: { backgroundColor: colors.primary },
  statusText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 6, 20, 0.7)' },
  modalScroll: { maxHeight: '90%' },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  modalSave: { marginTop: 12 },
});
