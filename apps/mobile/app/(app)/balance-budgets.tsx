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
import type { BalanceCategory } from '@velunee/contracts';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { formatMinor, minorToMajorText, parseMajorToMinor } from '@/features/balance/format';
import {
  useBalanceBudgets,
  useBalanceCategories,
  useSetBudget,
} from '@/features/balance/use-balance';
import { colors } from '@/theme/colors';

export default function BalanceBudgetsScreen(): React.JSX.Element {
  const router = useRouter();
  const budgetsQuery = useBalanceBudgets();
  const categoriesQuery = useBalanceCategories();
  const setBudget = useSetBudget();

  const [editing, setEditing] = useState<BalanceCategory | null>(null);
  const [limitText, setLimitText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const budgets = budgetsQuery.data?.budgets ?? [];
  const currency = budgetsQuery.data?.currency ?? 'BDT';
  const categories = categoriesQuery.data?.categories ?? [];
  const budgetedIds = new Set(budgets.map((budget) => budget.categoryId));
  const unbudgeted = categories.filter((category) => !budgetedIds.has(category.id));

  function openEditor(category: BalanceCategory, currentLimitMinor?: number): void {
    setEditing(category);
    setLimitText(currentLimitMinor ? minorToMajorText(currentLimitMinor) : '');
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!editing) return;
    const limitMinor = limitText.trim() === '' ? 0 : parseMajorToMinor(limitText);
    if (limitMinor === null) {
      setError('Enter an amount like 8000, or leave empty to remove the budget.');
      return;
    }
    try {
      await setBudget.mutateAsync({ categoryId: editing.id, limitMinor });
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    }
  }

  function confirmDelete(categoryId: string, name: string): void {
    Alert.alert('Remove budget', `Stop tracking a monthly budget for ${name}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setBudget.mutate({ categoryId, limitMinor: 0 }),
      },
    ]);
  }

  const isLoading = budgetsQuery.isLoading || categoriesQuery.isLoading;

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
        <Text style={styles.headerTitle}>Monthly budgets</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {budgets.length === 0 ? (
            <Text style={styles.emptyText}>
              Set a monthly limit for a category and Velunee will warn you before you pass it.
            </Text>
          ) : null}

          {budgets.map((budget) => {
            const category = categories.find((item) => item.id === budget.categoryId);
            return (
              <View key={budget.categoryId} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetName} numberOfLines={1}>
                    {budget.name}
                  </Text>
                  <Text
                    style={[
                      styles.budgetUsage,
                      budget.usedPercent >= 100 ? styles.budgetOver : null,
                    ]}
                  >
                    {budget.usedPercent}%
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${budget.name} budget`}
                    hitSlop={8}
                    onPress={() => (category ? openEditor(category, budget.limitMinor) : undefined)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primaryLight} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${budget.name} budget`}
                    hitSlop={8}
                    onPress={() => confirmDelete(budget.categoryId, budget.name)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
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
                <Text style={styles.budgetDetail}>
                  {formatMinor(currency, budget.spentMinor)} of{' '}
                  {formatMinor(currency, budget.limitMinor)}
                </Text>
              </View>
            );
          })}

          {unbudgeted.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Add a budget</Text>
              <View style={styles.chipWrap}>
                {unbudgeted.map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    onPress={() => openEditor(category)}
                    style={styles.categoryChip}
                  >
                    <Ionicons name="add" size={14} color={colors.primaryLight} />
                    <Text style={styles.categoryChipText}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing?.name} budget</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={() => setEditing(null)}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <FormField
              label="MONTHLY LIMIT (LEAVE EMPTY TO REMOVE)"
              placeholder="8000"
              keyboardType="numeric"
              value={limitText}
              onChangeText={setLimitText}
              errorText={error}
            />

            <PrimaryButton
              label="Save budget"
              onPress={() => void handleSave()}
              isLoading={setBudget.isPending}
              style={styles.modalButton}
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
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  budgetCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 10,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  budgetName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  budgetUsage: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  budgetOver: {
    color: colors.danger,
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
  progressOver: {
    backgroundColor: colors.danger,
  },
  budgetDetail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 20,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
  modalButton: {
    marginTop: 20,
  },
});
