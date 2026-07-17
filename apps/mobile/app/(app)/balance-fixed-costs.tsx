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
import type { FixedCost } from '@velunee/contracts';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { formatMinor, minorToMajorText, parseMajorToMinor } from '@/features/balance/format';
import {
  useCreateFixedCost,
  useDeleteFixedCost,
  useFixedCosts,
  useUpdateFixedCost,
} from '@/features/balance/use-balance';
import { colors } from '@/theme/colors';

const SUGGESTIONS = [
  'Home rent',
  'Utilities',
  'Loan & EMI',
  'Housekeeping',
  'Internet',
  'Insurance',
  'School fees',
  'Transport pass',
];

type Editing = FixedCost | 'new' | null;

export default function BalanceFixedCostsScreen(): React.JSX.Element {
  const router = useRouter();
  const query = useFixedCosts();
  const deleteFixedCost = useDeleteFixedCost();
  const [editing, setEditing] = useState<Editing>(null);

  const items = query.data?.fixedCosts ?? [];
  const currency = 'BDT';

  function confirmDelete(item: FixedCost): void {
    Alert.alert('Remove fixed cost', `Remove ${item.name}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteFixedCost.mutate(item.id) },
    ]);
  }

  function renderBody(): React.JSX.Element {
    if (query.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>RESERVED EACH MONTH</Text>
              <Text style={styles.totalValue}>
                {formatMinor(currency, query.data?.totalMinor ?? 0)}
              </Text>
              <Text style={styles.totalHint}>
                This total is set aside first, so paying these bills never lowers your daily spend
                limit.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            android_ripple={{ color: 'rgba(180, 150, 255, 0.10)' }}
            onPress={() => setEditing(item)}
            style={styles.row}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="repeat" size={18} color={colors.primaryLight} />
            </View>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowAmount}>{formatMinor(currency, item.amountMinor)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
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
            <Ionicons name="repeat" size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>No fixed costs yet</Text>
            <Text style={styles.stateBody}>
              Add your regular monthly commitments — rent, utilities, loan/EMI — so they&apos;re
              reserved before your daily spending limit is worked out.
            </Text>
          </View>
        }
        ListFooterComponent={
          <PrimaryButton
            label="Add fixed cost"
            icon="add"
            variant="outline"
            onPress={() => setEditing('new')}
            style={styles.addButton}
          />
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
        <Text style={styles.headerTitle}>Fixed costs</Text>
        <View style={styles.headerSpacer} />
      </View>
      {renderBody()}
      <FixedCostModal editing={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

function FixedCostModal({
  editing,
  onClose,
}: {
  editing: Editing;
  onClose: () => void;
}): React.JSX.Element {
  const create = useCreateFixedCost();
  const update = useUpdateFixedCost();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const isEdit = editing !== null && editing !== 'new';

  useEffect(() => {
    if (editing && editing !== 'new') {
      setName(editing.name);
      setAmount(minorToMajorText(editing.amountMinor));
      setError(null);
    } else if (editing === 'new') {
      setName('');
      setAmount('');
      setError(null);
    }
  }, [editing]);

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
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this cost a name, like Home rent.');
      return;
    }
    const amountMinor = parseMajorToMinor(amount);
    if (!amountMinor) {
      setError('Enter the monthly amount, like 15000.');
      return;
    }
    setError(null);

    const onDone = {
      onSuccess: () => onClose(),
      onError: (mutationError: unknown) =>
        setError(mutationError instanceof Error ? mutationError.message : 'Please try again.'),
    };

    if (editing !== null && editing !== 'new') {
      update.mutate({ fixedCostId: editing.id, input: { name: trimmed, amountMinor } }, onDone);
    } else {
      create.mutate({ name: trimmed, amountMinor }, onDone);
    }
  }

  const isSaving = create.isPending || update.isPending;

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={editing !== null}
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
            <Text style={styles.modalTitle}>{isEdit ? 'Edit fixed cost' : 'Add fixed cost'}</Text>
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
            {!isEdit ? (
              <View style={styles.chipWrap}>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    accessibilityRole="button"
                    onPress={() => setName(suggestion)}
                    style={name === suggestion ? [styles.chip, styles.chipActive] : styles.chip}
                  >
                    <Text
                      style={
                        name === suggestion
                          ? [styles.chipText, styles.chipTextActive]
                          : styles.chipText
                      }
                    >
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <FormField label="NAME" placeholder="Home rent" value={name} onChangeText={setName} />
            <FormField
              label="MONTHLY AMOUNT"
              placeholder="15000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              errorText={error ?? undefined}
            />

            <PrimaryButton
              label={isEdit ? 'Save changes' : 'Add fixed cost'}
              onPress={save}
              isLoading={isSaving}
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
    paddingBottom: 40,
    flexGrow: 1,
  },
  totalCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 8,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  totalValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  totalHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowName: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowAmount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  addButton: {
    marginTop: 16,
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
});
