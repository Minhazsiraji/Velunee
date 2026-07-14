import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SavingsGoal } from '@velunee/contracts';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { formatMinor, parseMajorToMinor } from '@/features/balance/format';
import {
  useContributeToGoal,
  useCreateGoal,
  useDeleteGoal,
  useSavingsGoals,
} from '@/features/balance/use-balance';
import { colors } from '@/theme/colors';

export default function BalanceGoalsScreen(): React.JSX.Element {
  const router = useRouter();
  const goalsQuery = useSavingsGoals();
  const deleteGoal = useDeleteGoal();

  const [createVisible, setCreateVisible] = useState(false);
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);

  const goals = goalsQuery.data?.goals ?? [];
  const currency = goalsQuery.data?.currency ?? 'BDT';

  function confirmDelete(goal: SavingsGoal): void {
    Alert.alert('Delete goal', `Remove "${goal.name}"? Your history will not change.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal.mutate(goal.id) },
    ]);
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Savings goals</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create goal"
          hitSlop={10}
          onPress={() => setCreateVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.primaryLight} />
        </Pressable>
      </View>

      {goalsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {goals.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="flag-outline" size={44} color={colors.textMuted} />
              <Text style={styles.stateTitle}>No savings goals yet</Text>
              <Text style={styles.stateBody}>
                Create a goal like an emergency fund, a new phone or a trip, and Velunee will track
                your progress.
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const percent =
                goal.targetMinor > 0
                  ? Math.min(100, Math.round((goal.savedMinor / goal.targetMinor) * 100))
                  : 0;
              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${goal.name}`}
                      hitSlop={10}
                      onPress={() => confirmDelete(goal)}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${percent}%` }]} />
                  </View>

                  <Text style={styles.goalDetail}>
                    {formatMinor(currency, goal.savedMinor)} of{' '}
                    {formatMinor(currency, goal.targetMinor)} · {percent}%
                  </Text>

                  <Text style={styles.goalEta}>
                    {goal.isAchieved
                      ? 'Goal achieved — congratulations!'
                      : goal.estimatedMonthsRemaining !== null
                        ? `About ${goal.estimatedMonthsRemaining} ${
                            goal.estimatedMonthsRemaining === 1 ? 'month' : 'months'
                          } to go at ${formatMinor(currency, goal.monthlyContributionMinor)} per month`
                        : 'Add a monthly contribution to estimate your finish date'}
                  </Text>

                  {!goal.isAchieved ? (
                    <PrimaryButton
                      label="Add money"
                      variant="outline"
                      onPress={() => setContributing(goal)}
                      style={styles.goalButton}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <CreateGoalModal visible={createVisible} onClose={() => setCreateVisible(false)} />
      <ContributeModal
        goal={contributing}
        currency={currency}
        onClose={() => setContributing(null)}
      />
    </SafeAreaView>
  );
}

function CreateGoalModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const createGoal = useCreateGoal();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthly, setMonthly] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close(): void {
    setName('');
    setTarget('');
    setMonthly('');
    setError(null);
    onClose();
  }

  async function handleSave(): Promise<void> {
    const targetMinor = parseMajorToMinor(target);
    if (!name.trim()) {
      setError('Give your goal a name, like New phone.');
      return;
    }
    if (!targetMinor) {
      setError('Enter a target amount, like 50000.');
      return;
    }
    const monthlyMinor = monthly.trim() ? parseMajorToMinor(monthly) : 0;
    if (monthlyMinor === null) {
      setError('The monthly contribution should be a number.');
      return;
    }
    setError(null);
    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        targetMinor,
        monthlyContributionMinor: monthlyMinor,
      });
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New savings goal</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <FormField label="NAME" placeholder="New phone" value={name} onChangeText={setName} />
          <FormField
            label="TARGET AMOUNT"
            placeholder="50000"
            keyboardType="numeric"
            value={target}
            onChangeText={setTarget}
          />
          <FormField
            label="MONTHLY CONTRIBUTION (OPTIONAL)"
            placeholder="5000"
            keyboardType="numeric"
            value={monthly}
            onChangeText={setMonthly}
            errorText={error}
          />

          <PrimaryButton
            label="Create goal"
            onPress={() => void handleSave()}
            isLoading={createGoal.isPending}
            style={styles.modalButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ContributeModal({
  goal,
  currency,
  onClose,
}: {
  goal: SavingsGoal | null;
  currency: string;
  onClose: () => void;
}): React.JSX.Element {
  const contribute = useContributeToGoal();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close(): void {
    setAmount('');
    setError(null);
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!goal) return;
    const amountMinor = parseMajorToMinor(amount);
    if (!amountMinor) {
      setError('Enter an amount like 5000.');
      return;
    }
    setError(null);
    try {
      const result = await contribute.mutateAsync({ goalId: goal.id, amountMinor });
      close();
      if (result.goal.isAchieved) {
        Alert.alert('Goal achieved!', `You reached your "${result.goal.name}" goal. Well done!`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    }
  }

  return (
    <Modal visible={goal !== null} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to {goal?.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {goal ? (
            <Text style={styles.modalHint}>
              Saved so far: {formatMinor(currency, goal.savedMinor)} of{' '}
              {formatMinor(currency, goal.targetMinor)}
            </Text>
          ) : null}

          <FormField
            label="AMOUNT TO ADD"
            placeholder="5000"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            errorText={error}
          />

          <PrimaryButton
            label="Add to goal"
            onPress={() => void handleSave()}
            isLoading={contribute.isPending}
            style={styles.modalButton}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    marginTop: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  goalDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  goalEta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  goalButton: {
    marginTop: 12,
    height: 44,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 5, 18, 0.72)',
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  modalButton: {
    marginTop: 20,
  },
});
