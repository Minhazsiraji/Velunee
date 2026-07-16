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
import type {
  CreateWardrobeItemInput,
  GarmentFormality,
  GarmentWarmth,
  StyleOccasion,
  SuggestOutfitResponse,
  WardrobeCategory,
  WardrobeItem,
} from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { useHomeOverview } from '@/features/home/use-home';
import {
  useCreateWardrobeItem,
  useDeleteWardrobeItem,
  useSaveOutfit,
  useSuggestOutfit,
  useWardrobe,
} from '@/features/style/use-style';
import { colors } from '@/theme/colors';

const OCCASIONS: StyleOccasion[] = ['casual', 'work', 'formal', 'party', 'travel'];
const CATEGORIES: WardrobeCategory[] = [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'accessory',
];
const WARMTHS: GarmentWarmth[] = ['light', 'medium', 'warm'];
const FORMALITIES: GarmentFormality[] = ['casual', 'smart', 'formal'];

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

export default function StyleScreen(): React.JSX.Element {
  const router = useRouter();
  const wardrobe = useWardrobe();
  const home = useHomeOverview();
  const suggest = useSuggestOutfit();
  const saveOutfit = useSaveOutfit();

  const [occasion, setOccasion] = useState<StyleOccasion>('casual');
  const [addVisible, setAddVisible] = useState(false);

  const temperatureC = home.data?.weather?.temperatureC;
  const rain = home.data?.weather?.advice?.toLowerCase().includes('umbrella') ?? false;

  function runSuggest(): void {
    suggest.mutate({
      occasion,
      ...(temperatureC !== undefined ? { temperatureC } : {}),
      rain,
    });
  }

  function saveSuggested(result: SuggestOutfitResponse): void {
    saveOutfit.mutate(
      {
        name: `${label(occasion)} look`,
        itemIds: result.pieces.map((p) => p.itemId),
        occasion,
      },
      {
        onSuccess: () => Alert.alert('Saved', 'This outfit is now in your saved looks.'),
        onError: (error) =>
          Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.'),
      },
    );
  }

  const items = wardrobe.data?.items ?? [];

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
        <Text style={styles.headerTitle}>Velunee Style</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a clothing item"
          hitSlop={10}
          onPress={() => setAddVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suggest an outfit</Text>
          <Text style={styles.cardHint}>
            Velunee picks from clothes you own, matched to the occasion
            {temperatureC !== undefined ? ` and today’s ${temperatureC}°C weather` : ''}. No ratings
            — just what works.
          </Text>
          <View style={styles.chipRow}>
            {OCCASIONS.map((value) => (
              <Chip
                key={value}
                text={label(value)}
                active={occasion === value}
                onPress={() => setOccasion(value)}
              />
            ))}
          </View>
          <PrimaryButton
            label="Suggest an outfit"
            icon="sparkles"
            onPress={runSuggest}
            isLoading={suggest.isPending}
            style={styles.suggestButton}
          />

          {suggest.data ? <OutfitResult result={suggest.data} onSave={saveSuggested} /> : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My wardrobe ({items.length})</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add item"
            hitSlop={10}
            onPress={() => setAddVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primaryLight} />
          </Pressable>
        </View>

        {wardrobe.isLoading ? (
          <ActivityIndicator color={colors.primaryLight} style={styles.loader} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>
            Add a few clothes and Velunee can start creating outfits from what you already own.
          </Text>
        ) : (
          items.map((item) => <WardrobeRow key={item.id} item={item} />)
        )}
      </ScrollView>

      <AddItemModal visible={addVisible} onClose={() => setAddVisible(false)} />
    </SafeAreaView>
  );
}

function OutfitResult({
  result,
  onSave,
}: {
  result: SuggestOutfitResponse;
  onSave: (result: SuggestOutfitResponse) => void;
}): React.JSX.Element {
  return (
    <View style={styles.result}>
      <Text style={styles.resultHeadline}>{result.headline}</Text>
      <Text style={styles.resultMessage}>{result.message}</Text>

      {result.pieces.map((piece) => (
        <View key={piece.itemId} style={styles.pieceRow}>
          <Text style={styles.pieceCategory}>{label(piece.category)}</Text>
          <Text style={styles.pieceName}>
            {piece.name}
            {piece.color ? ` · ${piece.color}` : ''}
          </Text>
        </View>
      ))}

      {result.missing.length > 0 ? (
        <Text style={styles.missingText}>
          Would be even better with: {result.missing.map(label).join(', ')}.
        </Text>
      ) : null}

      {result.tips.map((tip, index) => (
        <View key={index} style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={15} color={colors.primaryLight} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}

      {result.ok && result.pieces.length > 0 ? (
        <PrimaryButton
          label="Save this look"
          variant="outline"
          onPress={() => onSave(result)}
          style={styles.saveButton}
        />
      ) : null}
    </View>
  );
}

function WardrobeRow({ item }: { item: WardrobeItem }): React.JSX.Element {
  const deleteItem = useDeleteWardrobeItem();

  function confirmDelete(): void {
    Alert.alert('Remove item', `Remove “${item.name}” from your wardrobe?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem.mutate(item.id) },
    ]);
  }

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>
          {label(item.category)} · {item.color} · {label(item.warmth)} · {label(item.formality)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
        hitSlop={8}
        onPress={confirmDelete}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function AddItemModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const createItem = useCreateWardrobeItem();
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<WardrobeCategory>('top');
  const [warmth, setWarmth] = useState<GarmentWarmth>('medium');
  const [formality, setFormality] = useState<GarmentFormality>('casual');

  function reset(): void {
    setName('');
    setColor('');
    setCategory('top');
    setWarmth('medium');
    setFormality('casual');
  }

  async function handleSave(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const input: CreateWardrobeItemInput = {
      name: trimmed,
      category,
      warmth,
      formality,
      ...(color.trim() ? { color: color.trim() } : {}),
    };
    try {
      await createItem.mutateAsync(input);
      reset();
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
            <Text style={styles.modalTitle}>Add to wardrobe</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Navy trousers"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>COLOUR (OPTIONAL)</Text>
          <TextInput
            value={color}
            onChangeText={setColor}
            placeholder="e.g. navy"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((value) => (
              <Chip
                key={value}
                text={label(value)}
                active={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>WARMTH</Text>
          <View style={styles.chipRow}>
            {WARMTHS.map((value) => (
              <Chip
                key={value}
                text={label(value)}
                active={warmth === value}
                onPress={() => setWarmth(value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>FORMALITY</Text>
          <View style={styles.chipRow}>
            {FORMALITIES.map((value) => (
              <Chip
                key={value}
                text={label(value)}
                active={formality === value}
                onPress={() => setFormality(value)}
              />
            ))}
          </View>

          <PrimaryButton
            label="Add item"
            onPress={() => void handleSave()}
            isLoading={createItem.isPending}
            style={styles.modalSave}
          />
        </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  suggestButton: {
    marginTop: 2,
  },
  result: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 8,
  },
  resultHeadline: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  resultMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pieceCategory: {
    width: 84,
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  pieceName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  missingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 6, 20, 0.7)',
  },
  modalScroll: {
    maxHeight: '88%',
  },
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
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  modalSave: {
    marginTop: 12,
  },
});
