import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import type { PlannerTask, TaskPriority } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { todayIso } from '@/features/balance/format';
import {
  useCreateTask,
  useDeleteTask,
  usePlannerDay,
  useUpdateTask,
} from '@/features/planner/use-planner';
import { colors } from '@/theme/colors';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayLabel(day: string): string {
  const today = todayIso();
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  if (day === addDays(today, -1)) return 'Yesterday';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export default function PlannerScreen(): React.JSX.Element {
  const router = useRouter();
  const { editTaskId } = useLocalSearchParams<{ editTaskId?: string }>();
  const [day, setDay] = useState(todayIso());
  const planner = usePlannerDay(day);
  const updateTask = useUpdateTask();
  const [addVisible, setAddVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [handledEditTaskId, setHandledEditTaskId] = useState<string | null>(null);

  const data = planner.data;

  useEffect(() => {
    if (!editTaskId || editTaskId === handledEditTaskId || !data) return;
    const task = [...data.tasks, ...data.overdue].find((item) => item.id === editTaskId);
    if (!task || task.status === 'done') return;
    setEditingTask(task);
    setHandledEditTaskId(editTaskId);
  }, [data, editTaskId, handledEditTaskId]);

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
        <Text style={styles.headerTitle}>Planner</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add task"
          hitSlop={10}
          onPress={() => setAddVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.dayNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={10}
          onPress={() => setDay((d) => addDays(d, -1))}
        >
          <Ionicons name="chevron-back-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.dayLabel}>{dayLabel(day)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={10}
          onPress={() => setDay((d) => addDays(d, 1))}
        >
          <Ionicons name="chevron-forward-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {planner.isLoading ? (
          <ActivityIndicator color={colors.primaryLight} style={styles.loader} />
        ) : planner.isError || !data ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={styles.stateBody}>
              Couldn&apos;t load your plan. Check your connection.
            </Text>
            <PrimaryButton
              label="Retry"
              variant="outline"
              onPress={() => void planner.refetch()}
              style={styles.retry}
            />
          </View>
        ) : (
          <>
            <View style={[styles.loadCard, data.load.overloaded && styles.loadCardBusy]}>
              <Ionicons
                name={data.load.overloaded ? 'alert-circle' : 'checkmark-circle'}
                size={18}
                color={data.load.overloaded ? colors.danger : colors.primaryLight}
              />
              <Text style={styles.loadText}>{data.load.message}</Text>
            </View>

            {data.overdue.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Carried over</Text>
                {data.overdue.map((task) => (
                  <View key={task.id} style={styles.overdueRow}>
                    <Text style={styles.overdueTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <View style={styles.overdueRowActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${task.title}`}
                        hitSlop={8}
                        onPress={() => setEditingTask(task)}
                        style={styles.taskIconButton}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primaryLight} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          updateTask.mutate({
                            taskId: task.id,
                            patch: { dueOn: todayIso() },
                          })
                        }
                        style={styles.moveButton}
                      >
                        <Text style={styles.moveButtonText}>Move to today</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {data.tasks.length === 0 ? (
              <Text style={styles.emptyText}>
                Nothing here yet. Add a task to shape {dayLabel(day).toLowerCase()}.
              </Text>
            ) : (
              data.tasks.map((task) => (
                <TaskRow key={task.id} task={task} onEdit={() => setEditingTask(task)} />
              ))
            )}
          </>
        )}
      </ScrollView>

      <AddTaskModal visible={addVisible} day={day} onClose={() => setAddVisible(false)} />
      <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
    </SafeAreaView>
  );
}

function TaskRow({ task, onEdit }: { task: PlannerTask; onEdit: () => void }): React.JSX.Element {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const done = task.status === 'done';

  function toggle(): void {
    updateTask.mutate({
      taskId: task.id,
      patch: { status: done ? 'todo' : 'done' },
    });
  }

  function confirmDelete(): void {
    Alert.alert('Remove task', `Remove “${task.title}”?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteTask.mutate(task.id),
      },
    ]);
  }

  const meta = [
    task.scheduledTime,
    capitalize(task.priority),
    task.estimateMinutes ? `${task.estimateMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.taskRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Mark ${task.title} ${done ? 'not done' : 'done'}`}
        hitSlop={8}
        onPress={toggle}
      >
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={done ? colors.primaryLight : colors.textMuted}
        />
      </Pressable>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, done && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {meta ? <Text style={styles.taskMeta}>{meta}</Text> : null}
      </View>
      <View style={styles.taskActions}>
        {!done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${task.title}`}
            hitSlop={8}
            onPress={onEdit}
            style={styles.taskIconButton}
          >
            <Ionicons name="create-outline" size={18} color={colors.primaryLight} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${task.title}`}
          hitSlop={8}
          onPress={confirmDelete}
          style={styles.taskIconButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function EditTaskModal({
  task,
  onClose,
}: {
  task: PlannerTask | null;
  onClose: () => void;
}): React.JSX.Element {
  const update = useUpdateTask();
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [time, setTime] = useState('');
  const [estimate, setEstimate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDueOn(task.dueOn);
    setTime(task.scheduledTime ?? '');
    setEstimate(task.estimateMinutes ? String(task.estimateMinutes) : '');
    setPriority(task.priority);
  }, [task]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function save(): Promise<void> {
    if (!task) return;
    const trimmedTitle = title.trim();
    const trimmedDate = dueOn.trim();
    const trimmedTime = time.trim();
    if (!trimmedTitle) {
      Alert.alert('Add task text', 'The task cannot be empty.');
      return;
    }
    if (!isValidIsoDate(trimmedDate)) {
      Alert.alert('Check the date', 'Use a real date in YYYY-MM-DD format, e.g. 2026-08-03.');
      return;
    }
    if (trimmedTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedTime)) {
      Alert.alert('Check the time', 'Use 24-hour HH:MM, e.g. 09:00 or 18:30.');
      return;
    }
    const estimateMinutes = estimate.trim() ? Number(estimate.trim()) : null;
    if (
      estimateMinutes !== null &&
      (!Number.isInteger(estimateMinutes) || estimateMinutes < 1 || estimateMinutes > 1440)
    ) {
      Alert.alert('Check the estimate', 'Enter whole minutes from 1 to 1440.');
      return;
    }

    try {
      await update.mutateAsync({
        taskId: task.id,
        patch: {
          title: trimmedTitle,
          dueOn: trimmedDate,
          scheduledTime: trimmedTime || null,
          estimateMinutes,
          priority,
        },
      });
      onClose();
    } catch (error) {
      Alert.alert('Could not update task', error instanceof Error ? error.message : 'Try again.');
    }
  }

  return (
    <Modal
      visible={task !== null}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={[styles.modalRoot, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalCard}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit task</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close task editor"
              disabled={update.isPending}
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>TASK</Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="Task"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            selectionColor={colors.primaryLight}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>DATE</Text>
          <TextInput
            value={dueOn}
            onChangeText={setDueOn}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>TIME (OPTIONAL)</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="18:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>MINUTES (OPTIONAL)</Text>
              <TextInput
                value={estimate}
                onChangeText={setEstimate}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>PRIORITY</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                onPress={() => setPriority(value)}
                style={[styles.chip, priority === value && styles.chipActive]}
              >
                <Text style={[styles.chipText, priority === value && styles.chipTextActive]}>
                  {capitalize(value)}
                </Text>
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            label="Save changes"
            onPress={() => void save()}
            isLoading={update.isPending}
            style={styles.modalSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddTaskModal({
  visible,
  day,
  onClose,
}: {
  visible: boolean;
  day: string;
  onClose: () => void;
}): React.JSX.Element {
  const create = useCreateTask();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [estimate, setEstimate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // A native Modal renders in a separate Android window, which is not reliably
  // resized by KeyboardAvoidingView. Track the real keyboard height so the task
  // sheet and focused input always remain visible above it.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function reset(): void {
    setTitle('');
    setTime('');
    setEstimate('');
    setPriority('medium');
  }

  async function save(): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (time.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) {
      Alert.alert('Check the time', 'Use 24-hour HH:MM, e.g. 09:00 or 18:30.');
      return;
    }
    const estimateMinutes = estimate.trim() ? Number(estimate.trim()) : undefined;
    if (
      estimateMinutes !== undefined &&
      (!Number.isInteger(estimateMinutes) || estimateMinutes < 1)
    ) {
      Alert.alert('Check the estimate', 'Enter minutes as a whole number, e.g. 30.');
      return;
    }
    try {
      await create.mutateAsync({
        title: trimmed,
        dueOn: day,
        priority,
        ...(time.trim() ? { scheduledTime: time.trim() } : {}),
        ...(estimateMinutes !== undefined ? { estimateMinutes } : {}),
      });
      reset();
      onClose();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={[styles.modalRoot, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalCard}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a task</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>TASK</Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Buy groceries"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            selectionColor={colors.primaryLight}
            style={styles.input}
          />

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>TIME (OPTIONAL)</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="18:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>MINUTES (OPTIONAL)</Text>
              <TextInput
                value={estimate}
                onChangeText={setEstimate}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>PRIORITY</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                onPress={() => setPriority(value)}
                style={[styles.chip, priority === value && styles.chipActive]}
              >
                <Text style={[styles.chipText, priority === value && styles.chipTextActive]}>
                  {capitalize(value)}
                </Text>
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            label="Add task"
            onPress={() => void save()}
            isLoading={create.isPending}
            style={styles.modalSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' },
  addButton: { backgroundColor: colors.primary, borderRadius: 18, padding: 6 },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 8,
  },
  dayLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
  },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  loader: { marginVertical: 40 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  stateBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retry: { marginTop: 8 },
  loadCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  loadCardBusy: {
    backgroundColor: colors.dangerBackground,
    borderColor: colors.dangerBorder,
  },
  loadText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overdueTitle: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  overdueRowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moveButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moveButtonText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  taskInfo: { flex: 1, gap: 2 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  taskIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  taskTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  taskTitleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  taskMeta: { color: colors.textSecondary, fontSize: 12 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 6, 20, 0.7)',
  },
  modalScroll: { flexGrow: 0, maxHeight: '100%' },
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
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
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
  modalSave: { marginTop: 12 },
});
