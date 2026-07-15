import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { formatMinor } from '@/features/balance/format';
import { useBalanceReport } from '@/features/balance/use-balance';
import { colors } from '@/theme/colors';

export default function BalanceReportScreen(): React.JSX.Element {
  const router = useRouter();
  const report = useBalanceReport();
  const [showCalculation, setShowCalculation] = useState(false);

  function renderBody(): React.JSX.Element {
    if (report.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      );
    }

    if (report.isError || !report.data) {
      return (
        <View style={styles.center}>
          <Text style={styles.stateTitle}>Couldn&apos;t load the report</Text>
          <PrimaryButton
            label="Retry"
            variant="outline"
            onPress={() => void report.refetch()}
            style={styles.retry}
          />
        </View>
      );
    }

    const data = report.data;
    const currency = data.currency;
    const maxCategorySpend = Math.max(...data.byCategory.map((row) => row.spentMinor), 1);

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryMonth}>{data.month}</Text>
          <View style={styles.summaryRow}>
            <SummaryItem label="Income" value={formatMinor(currency, data.incomeMinor)} />
            <SummaryItem label="Spent" value={formatMinor(currency, data.spentMinor)} />
            <SummaryItem
              label="Saved"
              value={formatMinor(currency, data.savedMinor)}
              highlight={data.savedMinor >= 0}
            />
          </View>
          <Text style={styles.summaryRate}>
            {data.savingsRatePercent >= 0
              ? `You saved ${data.savingsRatePercent}% of your income this month.`
              : `You spent ${Math.abs(data.savingsRatePercent)}% more than your income this month.`}
          </Text>
          {data.previousMonth ? (
            <Text style={styles.summaryCompare}>
              {data.previousMonth.deltaMinor <= 0
                ? `You spent ${formatMinor(currency, Math.abs(data.previousMonth.deltaMinor))} less than in ${data.previousMonth.month}.`
                : `You spent ${formatMinor(currency, data.previousMonth.deltaMinor)} more than in ${data.previousMonth.month}.`}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by category</Text>
          {data.byCategory.length === 0 ? (
            <Text style={styles.emptyText}>No expenses recorded this month yet.</Text>
          ) : (
            data.byCategory.map((row) => (
              <View key={row.categoryId ?? 'uncategorised'} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{row.name}</Text>
                  <Text style={styles.categoryAmount}>
                    {formatMinor(currency, row.spentMinor)} · {row.sharePercent}%
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.round((row.spentMinor / maxCategorySpend) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <HighlightRow
            icon="calendar"
            text={
              data.highestSpendingDay
                ? `Highest spending day: ${data.highestSpendingDay.date} (${formatMinor(currency, data.highestSpendingDay.spentMinor)})`
                : 'No spending days recorded yet.'
            }
          />
          <HighlightRow
            icon="trending-down"
            text={`Average daily spending: ${formatMinor(currency, data.averageDailySpendMinor)}`}
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
      </ScrollView>
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
        <Text style={styles.headerTitle}>Monthly report</Text>
        <View style={styles.headerSpacer} />
      </View>
      {renderBody()}
    </SafeAreaView>
  );
}

function SummaryItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[styles.summaryValue, highlight ? styles.summaryValueHighlight : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function HighlightRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}): React.JSX.Element {
  return (
    <View style={styles.highlightRow}>
      <Ionicons name={icon} size={16} color={colors.primaryLight} style={styles.highlightIcon} />
      <Text style={styles.highlightText}>{text}</Text>
    </View>
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
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  retry: {
    marginTop: 16,
    width: 160,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  summaryMonth: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryValueHighlight: {
    color: colors.primaryLight,
  },
  summaryRate: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  summaryCompare: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  categoryRow: {
    marginTop: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryAmount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  highlightIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  highlightText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
});
