import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BalanceTransaction } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { formatMinor } from '@/features/balance/format';
import { useBalanceTransactions, useDeleteTransaction } from '@/features/balance/use-balance';
import { colors } from '@/theme/colors';

export default function BalanceTransactionsScreen(): React.JSX.Element {
  const router = useRouter();
  const transactionsQuery = useBalanceTransactions();
  const deleteTransaction = useDeleteTransaction();

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
          <View style={styles.row}>
            <View
              style={[styles.kindBadge, item.kind === 'income' ? styles.kindBadgeIncome : null]}
            >
              <Ionicons
                name={item.kind === 'income' ? 'arrow-down' : 'arrow-up'}
                size={16}
                color={item.kind === 'income' ? colors.primaryLight : colors.danger}
              />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>
                {item.categoryName ?? (item.kind === 'income' ? 'Income' : 'Expense')}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.occurredOn}
                {item.note ? ` · ${item.note}` : ''}
              </Text>
            </View>
            <Text
              style={[styles.rowAmount, item.kind === 'income' ? styles.rowAmountIncome : null]}
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
          </View>
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
    borderColor: colors.borderSoft,
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
  },
  footerLoader: {
    marginVertical: 16,
  },
});
