import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BalanceTransaction } from '@velunee/contracts';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { formatMinor, minorToMajorText, parseMajorToMinor } from '@/features/balance/format';
import {
  useBalanceCategories,
  useBalanceTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
} from '@/features/balance/use-balance';
import { colors } from '@/theme/colors';

export default function BalanceTransactionsScreen(): React.JSX.Element {
  const router = useRouter();
  const transactionsQuery = useBalanceTransactions();
  const deleteTransaction = useDeleteTransaction();
  const [editing, setEditing] = useState<BalanceTransaction | null>(null);

  const transactions = transactionsQuery.data?.pages.flatMap((page) => page.transactions) ?? [];

  function confirmDelete(transaction: BalanceTransaction): void {
    Alert.alert(
      'Delete entry',
      `Remove ${formatMinor(transaction.currency, transaction.amountMinor)}${
        transaction.categoryName ? ` (${transaction.categoryName})` : ''
      }?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction.mutate(transaction.id),
        },
      ],
    );
  }

  function renderBody(): React.JSX.Element {
    if (transactionsQuery.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      );
    }

    if (transactionsQuery.isError) {
      return (
        <View style={styles.center}>
          <Text style={styles.stateTitle}>Couldn&apos;t load your transactions</Text>
          <PrimaryButton
            label="Retry"
            variant="outline"
            onPress={() => void transactionsQuery.refetch()}
            style={styles.retry}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={transactionsQuery.isRefetching}
        onRefresh={() => void transactionsQuery.refetch()}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (transactionsQuery.hasNextPage && !transactionsQuery.isFetchingNextPage) {
            void transactionsQuery.fetchNextPage();
          }
        }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.categoryName ?? item.kind} entry`}
            android_ripple={{ color: 'rgba(180, 150, 255, 0.10)' }}
            onPress={() => setEditing(item)}
            style={styles.row}
          >
            <View
              style={
                item.kind === 'income'
                  ? [styles.kindBadge, styles.kindBadgeIncome]
                  : styles.kindBadge
              }
            >
              <Ionicons
                name={item.kind === 'income' ? 'arrow-down' : 'arrow-up'}
                size={16}
                color={item.kind === 'income' ? colors.primaryLight : colors.danger}
              />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>
                {item.fixedCostName ??
                  item.categoryName ??
                  (item.kind === 'income' ? 'Income' : 'Expense')}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.fixedCostName ? 'Fixed cost · ' : ''}
                {item.occurredOn}
                {item.note ? ` · ${item.note}` : ''}
              </Text>
            </View>
            <Text
              style={
                item.kind === 'income'
                  ? [styles.rowAmount, styles.rowAmountIncome]
                  : styles.rowAmount
              }
            >
              {item.kind === 'income' ? '+' : '−'}
              {formatMinor(item.currency, item.amountMinor)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete entry"
              hitSlop={10}
              onPress={() => confirmDelete(item)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>No entries this month yet</Text>
            <Text style={styles.stateBody}>
              Your money history will appear here. Add your first income or expense to begin.
            </Text>
          </View>
        }
        ListFooterComponent={
          transactionsQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primaryLight} style={styles.footerLoader} />
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>This month&apos;s entries</Text>
        <View style={styles.headerSpacer} />
      </View>
      {renderBody()}
      <EditTransactionModal transaction={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

function EditTransactionModal({
  transaction,
  onClose,
}: {
  transaction: BalanceTransaction | null;
  onClose: () => void;
}): React.JSX.Element {
  const categories = useBalanceCategories();
  const update = useUpdateTransaction();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (transaction) {
      setKind(transaction.kind);
      setAmount(minorToMajorText(transaction.amountMinor));
      setCategoryId(transaction.categoryId);
      setNote(transaction.note ?? '');
      setError(null);
    }
  }, [transaction]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function save(): void {
    if (!transaction) return;
    const amountMinor = parseMajorToMinor(amount);
    if (!amountMinor) {
      setError('Enter an amount like 250 or 1,250.50.');
      return;
    }
    setError(null);
    update.mutate(
      {
        transactionId: transaction.id,
        input: {
          kind,
          amountMinor,
          categoryId: kind === 'expense' ? categoryId : null,
          note: note.trim() ? note.trim() : null,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) =>
          setError(mutationError instanceof Error ? mutationError.message : 'Please try again.'),
      },
    );
  }

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={transaction !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, { paddingBottom: keyboardHeight }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit entry</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.kindRow}>
              {(['expense', 'income'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setKind(value)}
                  style={
                    kind === value ? [styles.kindChip, styles.kindChipActive] : styles.kindChip
                  }
                >
                  <Text
                    style={
                      kind === value
                        ? [styles.kindChipText, styles.kindChipTextActive]
                        : styles.kindChipText
                    }
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
                    style={
                      categoryId === category.id
                        ? [styles.categoryChip, styles.categoryChipActive]
                        : styles.categoryChip
                    }
                  >
                    <Text
                      style={
                        categoryId === category.id
                          ? [styles.categoryChipText, styles.categoryChipTextActive]
                          : styles.categoryChipText
                      }
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
              errorText={error ?? undefined}
            />

            <PrimaryButton
              label="Save changes"
              onPress={save}
              isLoading={update.isPending}
              style={styles.modalButton}
            />
          </ScrollView>
        </View>
      </View>
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
  headerSpacer: {
    width: 24,
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
  retry: {
    marginTop: 16,
    width: 160,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 8,
  },
  kindBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindBadgeIncome: {
    backgroundColor: colors.surfaceElevated,
  },
  rowInfo: {
    flex: 1,
    paddingHorizontal: 10,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  rowAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  rowAmountIncome: {
    color: colors.primaryLight,
  },
  deleteButton: {
    marginLeft: 10,
    padding: 4,
  },
  footerLoader: {
    marginVertical: 16,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalButton: {
    marginTop: 20,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
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
    marginTop: 4,
    marginBottom: 4,
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
