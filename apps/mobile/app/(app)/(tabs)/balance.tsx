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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BalanceOverviewResponse } from '@velunee/contracts';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import {
  useBalanceCategories,
  useBalanceOverview,
  useCreateBill,
  useCreateTransaction,
  useDeleteBill,
  useParseSpending,
  useUpdateBalanceProfile,
} from '@/features/balance/use-balance';
import { formatMinor, parseMajorToMinor } from '@/features/balance/format';
import { colors } from '@/theme/colors';

export default function BalanceScreen(): React.JSX.Element {
  const overview = useBalanceOverview();
  const [addVisible, setAddVisible] = useState(false);
  const [billVisible, setBillVisible] = useState(false);

  function renderBody(): React.JSX.Element {
    if (overview.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      );
    }

    if (overview.isError || !overview.data) {
      return (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Couldn&apos;t load your balance</Text>
          <Text style={styles.stateBody}>Check your connection and try again.</Text>
          <PrimaryButton
            label="Retry"
            variant="outline"
            onPress={() => void overview.refetch()}
            style={styles.retry}
          />
        </View>
      );
    }

    if (!overview.data.isConfigured) {
      return <SetupForm />;
    }

    return (
      <Dashboard
        data={overview.data}
        onOpenAdd={() => setAddVisible(true)}
        onOpenBill={() => setBillVisible(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Balance</Text>
        {overview.data?.isConfigured ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add income or expense"
            hitSlop={10}
            onPress={() => setAddVisible(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </Pressable>
        ) : null}
      </View>

      {renderBody()}

      <AddEntryModal visible={addVisible} onClose={() => setAddVisible(false)} />
      <AddBillModal visible={billVisible} onClose={() => setBillVisible(false)} />
    </SafeAreaView>
  );
}

function SetupForm(): React.JSX.Element {
  const updateProfile = useUpdateBalanceProfile();
  const [income, setIncome] = useState('');
  const [fixed, setFixed] = useState('');
  const [savings, setSavings] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSave(): void {
    const incomeMinor = parseMajorToMinor(income);
    if (!incomeMinor) {
      setError('Enter your monthly income to build your plan.');
      return;
    }
    const fixedMinor = fixed ? parseMajorToMinor(fixed) : 0;
    const savingsMinor = savings ? parseMajorToMinor(savings) : 0;
    if (fixedMinor === null || savingsMinor === null) {
      setError('Amounts should be numbers like 25000 or 1,250.50.');
      return;
    }
    setError(null);
    updateProfile.mutate(
      {
        monthlyIncomeMinor: incomeMinor,
        fixedExpensesMinor: fixedMinor,
        savingsTargetMinor: savingsMinor,
      },
      {
        onError: (mutationError) => {
          setError(mutationError instanceof Error ? mutationError.message : 'Please try again.');
        },
      },
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.setupContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Ionicons name="wallet-outline" size={44} color={colors.primaryLight} />
      <Text style={styles.setupTitle}>Set up Velunee Balance</Text>
      <Text style={styles.setupBody}>
        Tell Velunee about your month and it will plan a safe daily spending limit for you. You can
        change these numbers anytime.
      </Text>

      <FormField
        label="MONTHLY INCOME (BDT)"
        placeholder="60000"
        keyboardType="numeric"
        value={income}
        onChangeText={setIncome}
      />
      <FormField
        label="FIXED MONTHLY EXPENSES (OPTIONAL)"
        placeholder="25000 — rent, bills, EMI"
        keyboardType="numeric"
        value={fixed}
        onChangeText={setFixed}
      />
      <FormField
        label="MONTHLY SAVINGS GOAL (OPTIONAL)"
        placeholder="10000"
        keyboardType="numeric"
        value={savings}
        onChangeText={setSavings}
        errorText={error}
      />

      <PrimaryButton
        label="Create my plan"
        onPress={handleSave}
        isLoading={updateProfile.isPending}
        style={styles.setupButton}
      />
      <Text style={styles.setupPrivacy}>
        Your financial information is private. It is never shared with the community.
      </Text>
    </ScrollView>
  );
}

interface DashboardProps {
  data: BalanceOverviewResponse;
  onOpenAdd: () => void;
  onOpenBill: () => void;
}

function Dashboard({ data, onOpenAdd, onOpenBill }: DashboardProps): React.JSX.Element {
  const router = useRouter();
  const deleteBill = useDeleteBill();
  const [showCalculation, setShowCalculation] = useState(false);
  const { currency, totals, daily } = data;

  const spentPercent =
    totals.incomeMinor > 0
      ? Math.min(100, Math.round((totals.spentMinor / totals.incomeMinor) * 100))
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.dashboard} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Safe to spend today</Text>
        <Text style={styles.heroAmount}>
          {formatMinor(currency, daily.safeToSpendTodayMinor)}
        </Text>
        <Text style={styles.heroHint}>
          {formatMinor(currency, totals.remainingMinor)} left for {daily.daysRemaining}{' '}
          {daily.daysRemaining === 1 ? 'day' : 'days'} · daily limit{' '}
          {formatMinor(currency, daily.suggestedDailyLimitMinor)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${spentPercent}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          Spent {formatMinor(currency, totals.spentMinor)} of{' '}
          {formatMinor(currency, totals.incomeMinor)} income
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Income" value={formatMinor(currency, totals.incomeMinor)} />
        <StatCard label="Spent" value={formatMinor(currency, totals.spentMinor)} />
        <StatCard
          label="Savings goal"
          value={formatMinor(currency, totals.savingsTargetMinor)}
        />
      </View>

      {data.insights.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Velunee noticed</Text>
          {data.insights.map((insight) => (
            <View key={insight.id} style={styles.insightRow}>
              <Ionicons
                name={
                  insight.tone === 'warning'
                    ? 'alert-circle'
                    : insight.tone === 'positive'
                      ? 'checkmark-circle'
                      : 'information-circle'
                }
                size={18}
                color={
                  insight.tone === 'warning'
                    ? colors.danger
                    : insight.tone === 'positive'
                      ? colors.primaryLight
                      : colors.textSecondary
                }
                style={styles.insightIcon}
              />
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.topCategories.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Where your money went</Text>
          {data.topCategories.map((category) => (
            <View key={category.categoryId ?? 'uncategorised'} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryAmount}>
                {formatMinor(currency, category.spentMinor)} · {category.sharePercent}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.budgets.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budgets</Text>
          {data.budgets.slice(0, 3).map((budget) => (
            <View key={budget.categoryId} style={styles.budgetRow}>
              <View style={styles.budgetHeader}>
                <Text style={styles.categoryName}>{budget.name}</Text>
                <Text
                  style={[
                    styles.categoryAmount,
                    budget.usedPercent >= 100 ? styles.budgetOver : null,
                  ]}
                >
                  {budget.usedPercent}% used
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, budget.usedPercent)}%` },
                    budget.usedPercent >= 100 ? styles.progressOver : null,
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming bills</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add bill reminder"
            hitSlop={10}
            onPress={onOpenBill}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primaryLight} />
          </Pressable>
        </View>
        {data.upcomingBills.length === 0 ? (
          <Text style={styles.emptyText}>
            Add rent, electricity or EMI reminders and Velunee will warn you before they are due.
          </Text>
        ) : (
          data.upcomingBills.map((bill) => (
            <View key={bill.id} style={styles.billRow}>
              <View style={styles.billInfo}>
                <Text style={styles.categoryName}>{bill.name}</Text>
                <Text style={styles.billDue}>
                  {bill.dueInDays === 0
                    ? 'Due today'
                    : bill.dueInDays === 1
                      ? 'Due tomorrow'
                      : `Due in ${bill.dueInDays} days`}{' '}
                  · {formatMinor(currency, bill.amountMinor)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${bill.name} reminder`}
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Remove reminder', `Stop reminding you about ${bill.name}?`, [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => deleteBill.mutate(bill.id),
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.linksRow}>
        <QuickLink
          icon="list"
          label="Transactions"
          onPress={() => router.push('/balance-transactions')}
        />
        <QuickLink
          icon="pie-chart"
          label="Budgets"
          onPress={() => router.push('/balance-budgets')}
        />
        <QuickLink icon="flag" label="Goals" onPress={() => router.push('/balance-goals')} />
        <QuickLink
          icon="stats-chart"
          label="Report"
          onPress={() => router.push('/balance-report')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowCalculation((value) => !value)}
        style={styles.calculationToggle}
      >
        <Ionicons
          name={showCalculation ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={styles.calculationToggleText}>How was this calculated?</Text>
      </Pressable>
      {showCalculation ? (
        <View style={styles.calculationBox}>
          {data.calculation.map((line, index) => (
            <Text key={index} style={styles.calculationLine}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}

      <PrimaryButton label="Add income or expense" icon="add" onPress={onOpenAdd} style={styles.addCta} />
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickLink}>
      <Ionicons name={icon} size={20} color={colors.primaryLight} />
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </Pressable>
  );
}

function AddEntryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const categories = useBalanceCategories();
  const createTransaction = useCreateTransaction();
  const parseSpending = useParseSpending();

  const [quickText, setQuickText] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset(): void {
    setQuickText('');
    setKind('expense');
    setAmount('');
    setCategoryId(null);
    setNote('');
    setError(null);
  }

  function close(): void {
    reset();
    onClose();
  }

  async function handleQuickAdd(): Promise<void> {
    const text = quickText.trim();
    if (!text) return;
    setError(null);
    try {
      const { entries } = await parseSpending.mutateAsync(text);
      if (entries.length === 0) {
        setError('Velunee could not find an amount there. Try "250 for lunch".');
        return;
      }
      const summaries: string[] = [];
      for (const entry of entries) {
        const saved = await createTransaction.mutateAsync({
          kind: entry.kind,
          amountMinor: entry.amountMinor,
          categoryId: entry.categoryId ?? undefined,
          note: entry.note,
          paymentMethod: 'cash',
        });
        summaries.push(
          `${formatMinor(saved.transaction.currency, saved.transaction.amountMinor)}${
            entry.categoryName ? ` under ${entry.categoryName}` : ''
          }`,
        );
      }
      close();
      Alert.alert('Recorded', `Velunee recorded ${summaries.join(' and ')}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    }
  }

  async function handleManualAdd(): Promise<void> {
    const amountMinor = parseMajorToMinor(amount);
    if (!amountMinor) {
      setError('Enter an amount like 250 or 1,250.50.');
      return;
    }
    setError(null);
    try {
      await createTransaction.mutateAsync({
        kind,
        amountMinor,
        categoryId: kind === 'expense' && categoryId ? categoryId : undefined,
        note: note.trim() ? note.trim() : undefined,
        paymentMethod: 'cash',
      });
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    }
  }

  const isSaving = createTransaction.isPending || parseSpending.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add income or expense</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.quickRow}>
              <TextInput
                placeholder='Try "I spent 250 for lunch"'
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primaryLight}
                style={styles.quickInput}
                value={quickText}
                onChangeText={setQuickText}
                onSubmitEditing={() => void handleQuickAdd()}
                returnKeyType="send"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Record from text"
                onPress={() => void handleQuickAdd()}
                style={styles.quickButton}
                disabled={isSaving}
              >
                <Ionicons name="flash" size={20} color={colors.white} />
              </Pressable>
            </View>

            <Text style={styles.orDivider}>or enter manually</Text>

            <View style={styles.kindRow}>
              {(['expense', 'income'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setKind(value)}
                  style={[styles.kindChip, kind === value ? styles.kindChipActive : null]}
                >
                  <Text
                    style={[styles.kindChipText, kind === value ? styles.kindChipTextActive : null]}
                  >
                    {value === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <FormField
              label="AMOUNT"
              placeholder="250"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            {kind === 'expense' ? (
              <View style={styles.chipWrap}>
                {(categories.data?.categories ?? []).map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    onPress={() =>
                      setCategoryId((current) => (current === category.id ? null : category.id))
                    }
                    style={[
                      styles.categoryChip,
                      categoryId === category.id ? styles.categoryChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        categoryId === category.id ? styles.categoryChipTextActive : null,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <FormField
              label="NOTE (OPTIONAL)"
              placeholder="Lunch with colleagues"
              value={note}
              onChangeText={setNote}
              errorText={error}
            />

            <PrimaryButton
              label={kind === 'expense' ? 'Add expense' : 'Add income'}
              onPress={() => void handleManualAdd()}
              isLoading={isSaving}
              style={styles.modalButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddBillModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const createBill = useCreateBill();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close(): void {
    setName('');
    setAmount('');
    setDueDay('');
    setError(null);
    onClose();
  }

  async function handleSave(): Promise<void> {
    const amountMinor = parseMajorToMinor(amount);
    const day = Number(dueDay);
    if (!name.trim()) {
      setError('Give this bill a name, like Electricity.');
      return;
    }
    if (!amountMinor) {
      setError('Enter the usual amount, like 1200.');
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setError('The due day should be between 1 and 31.');
      return;
    }
    setError(null);
    try {
      await createBill.mutateAsync({ name: name.trim(), amountMinor, dueDay: day });
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
            <Text style={styles.modalTitle}>Bill reminder</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <FormField label="NAME" placeholder="Electricity" value={name} onChangeText={setName} />
          <FormField
            label="AMOUNT"
            placeholder="1200"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <FormField
            label="DUE DAY OF MONTH"
            placeholder="10"
            keyboardType="numeric"
            value={dueDay}
            onChangeText={setDueDay}
            errorText={error}
          />

          <PrimaryButton
            label="Save reminder"
            onPress={() => void handleSave()}
            isLoading={createBill.isPending}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  retry: {
    marginTop: 18,
    width: 160,
  },
  setupContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  setupTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
  },
  setupBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  setupButton: {
    marginTop: 24,
  },
  setupPrivacy: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 14,
    textAlign: 'center',
  },
  dashboard: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 6,
  },
  heroHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressOver: {
    backgroundColor: colors.danger,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  insightIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  insightText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryAmount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  budgetRow: {
    marginTop: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetOver: {
    color: colors.danger,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  billInfo: {
    flex: 1,
    paddingRight: 10,
  },
  billDue: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: 12,
  },
  quickLinkLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  calculationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  calculationToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  calculationBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 14,
    marginTop: 10,
  },
  calculationLine: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  addCta: {
    marginTop: 18,
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
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalButton: {
    marginTop: 20,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  quickInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  quickButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orDivider: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kindChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  kindChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  kindChipTextActive: {
    color: colors.white,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.white,
  },
});
