import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DecideResponse } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { useDecide } from '@/features/decide/use-decide';
import { colors } from '@/theme/colors';

const EXAMPLES = [
  'Can I afford a 2500 dinner tonight?',
  'What should I wear to the office tomorrow?',
  'Should I go out today?',
  'Should I buy this or wait?',
];

export default function DecideScreen(): React.JSX.Element {
  const decide = useDecide();
  const [question, setQuestion] = useState('');

  function ask(value?: string): void {
    const q = (value ?? question).trim();
    if (!q) return;
    if (value) setQuestion(value);
    decide.mutate(q);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecideHeader />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Tell Velunee what you&apos;re deciding. It weighs your day — weather, budget, and what
            you&apos;ve asked it to remember — and suggests a next step. You stay in control.
          </Text>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="e.g. Can I afford this, or should I wait?"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            style={styles.input}
          />
          <PrimaryButton
            label="Help me decide"
            icon="sparkles"
            onPress={() => ask()}
            isLoading={decide.isPending}
            style={styles.askButton}
          />

          {!decide.data && !decide.isPending ? (
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>Try asking</Text>
              {EXAMPLES.map((example) => (
                <Pressable
                  key={example}
                  accessibilityRole="button"
                  onPress={() => ask(example)}
                  style={styles.exampleChip}
                >
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={16}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.exampleText}>{example}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {decide.isPending ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.primaryLight} />
              <Text style={styles.stateBody}>Weighing your options…</Text>
            </View>
          ) : null}

          {decide.isError ? (
            <View style={styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
              <Text style={styles.stateBody}>
                {decide.error instanceof Error
                  ? decide.error.message
                  : 'Velunee could not answer right now. Please try again.'}
              </Text>
            </View>
          ) : null}

          {decide.data ? <DecisionResult data={decide.data} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DecideHeader(): React.JSX.Element {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Velunee Decide</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function DecisionResult({ data }: { data: DecideResponse }): React.JSX.Element {
  const router = useRouter();
  const [showCalculation, setShowCalculation] = useState(false);

  function runNextAction(): void {
    switch (data.nextAction?.kind) {
      case 'add_expense':
      case 'open_balance':
        router.push('/(app)/(tabs)/balance');
        break;
      case 'ask_chat':
        router.push('/(app)/(tabs)/chat');
        break;
      default:
        break;
    }
  }

  return (
    <View style={styles.result}>
      <View style={styles.recommendationCard}>
        <Text style={styles.recommendationLabel}>Velunee suggests</Text>
        <Text style={styles.recommendationText}>{data.recommendation}</Text>
        <Text style={styles.reasoning}>{data.reasoning}</Text>
      </View>

      {data.considered.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>What Velunee considered</Text>
          {data.considered.map((item) => (
            <View key={item.label} style={styles.consideredRow}>
              <Text style={styles.consideredLabel}>{item.label}</Text>
              <Text style={styles.consideredValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.alternative ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Alternative</Text>
          <Text style={styles.blockBody}>{data.alternative}</Text>
        </View>
      ) : null}

      {data.impact ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Possible impact</Text>
          <Text style={styles.blockBody}>{data.impact}</Text>
        </View>
      ) : null}

      {data.affordability ? (
        <View style={styles.block}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCalculation((value) => !value)}
            style={styles.calcToggle}
          >
            <Ionicons
              name={showCalculation ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.calcToggleText}>How was this calculated?</Text>
          </Pressable>
          {showCalculation ? (
            <View style={styles.calcBox}>
              {data.affordability.calculation.map((line, index) => (
                <Text key={index} style={styles.calcLine}>
                  • {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {data.nextAction && data.nextAction.kind !== 'none' ? (
        <PrimaryButton
          label={data.nextAction.label}
          variant="outline"
          onPress={runNextAction}
          style={styles.nextAction}
        />
      ) : null}

      <Text style={styles.control}>This is a suggestion — the final call is always yours.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  lead: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  askButton: {
    marginTop: 2,
  },
  examples: {
    gap: 8,
    marginTop: 8,
  },
  examplesTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  exampleText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  result: {
    gap: 12,
    marginTop: 4,
  },
  recommendationCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  recommendationLabel: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  recommendationText: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 26,
  },
  reasoning: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  block: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  blockTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  blockBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  consideredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  consideredLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  consideredValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  calcToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calcToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  calcBox: {
    gap: 4,
  },
  calcLine: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  nextAction: {
    marginTop: 2,
  },
  control: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
