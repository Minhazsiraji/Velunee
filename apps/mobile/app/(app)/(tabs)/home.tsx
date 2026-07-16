import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeCardPreferences, HomeOverviewResponse } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { formatMinor } from '@/features/balance/format';
import { useHomeOverview, useUpdateHomeCards } from '@/features/home/use-home';
import { colors } from '@/theme/colors';

const CARD_LABELS: Record<keyof HomeCardPreferences, string> = {
  weather: 'Weather',
  balance: 'Safe to spend',
  bills: 'Upcoming bill',
  recentConversation: 'Recent conversation',
  suggestion: 'Daily suggestion',
};

export default function HomeScreen(): React.JSX.Element {
  const overview = useHomeOverview();
  const [settingsVisible, setSettingsVisible] = useState(false);

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
          <Text style={styles.stateTitle}>Couldn&apos;t load your day</Text>
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

    return (
      <Dashboard
        data={overview.data}
        refreshing={overview.isRefetching}
        onRefresh={() => void overview.refetch()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose which cards appear"
          hitSlop={10}
          onPress={() => setSettingsVisible(true)}
          style={styles.settingsButton}
        >
          <Ionicons name="options-outline" size={22} color={colors.white} />
        </Pressable>
      </View>

      {renderBody()}

      <CardSettingsModal
        visible={settingsVisible}
        cards={overview.data?.cards ?? null}
        onClose={() => setSettingsVisible(false)}
      />
    </SafeAreaView>
  );
}

function Dashboard({
  data,
  refreshing,
  onRefresh,
}: {
  data: HomeOverviewResponse;
  refreshing: boolean;
  onRefresh: () => void;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primaryLight}
        />
      }
    >
      <Text style={styles.greeting}>{data.greeting.title}</Text>
      {data.greeting.subtitle ? (
        <Text style={styles.subtitle}>{data.greeting.subtitle}</Text>
      ) : null}

      {data.suggestion ? (
        <View style={[styles.card, styles.suggestionCard]}>
          <Ionicons name="sparkles" size={18} color={colors.primaryLight} />
          <Text style={styles.suggestionText}>{data.suggestion.message}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Velunee to help you decide"
        onPress={() => router.push('/decide')}
        style={styles.decideCta}
      >
        <Ionicons name="git-compare-outline" size={20} color={colors.white} />
        <View style={styles.decideCtaText}>
          <Text style={styles.decideCtaTitle}>Help me decide</Text>
          <Text style={styles.decideCtaBody}>
            Wear, buy, go out? Velunee weighs your day and suggests a next step.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.white} />
      </Pressable>

      {data.weather ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="partly-sunny-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.cardLabel}>Weather · {data.weather.locationName}</Text>
          </View>
          <Text style={styles.cardValue}>
            {data.weather.temperatureC}°C
            {data.weather.condition ? ` · ${data.weather.condition}` : ''}
          </Text>
          {data.weather.feelsLikeC !== null ? (
            <Text style={styles.cardMeta}>Feels like {data.weather.feelsLikeC}°C</Text>
          ) : null}
          {data.weather.advice ? (
            <Text style={styles.cardAdvice}>{data.weather.advice}</Text>
          ) : null}
        </View>
      ) : null}

      {data.balance ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Velunee Balance"
          onPress={() => router.push('./balance')}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.cardLabel}>Safe to spend today</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
          {data.balance.isConfigured ? (
            <>
              <Text style={styles.cardValue}>
                {formatMinor(data.balance.currency, data.balance.safeToSpendTodayMinor)}
              </Text>
              <Text style={styles.cardMeta}>
                {data.balance.daysRemaining} days left this month · daily limit{' '}
                {formatMinor(data.balance.currency, data.balance.suggestedDailyLimitMinor)}
              </Text>
            </>
          ) : (
            <Text style={styles.cardMeta}>
              Set up Velunee Balance to see how much you can safely spend today.
            </Text>
          )}
        </Pressable>
      ) : null}

      {data.upcomingBill ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.cardLabel}>Upcoming bill</Text>
          </View>
          <Text style={styles.cardValue}>
            {data.upcomingBill.name} ·{' '}
            {formatMinor(data.upcomingBill.currency, data.upcomingBill.amountMinor)}
          </Text>
          <Text style={styles.cardMeta}>
            {data.upcomingBill.dueInDays === 0
              ? 'Due today'
              : data.upcomingBill.dueInDays === 1
                ? 'Due tomorrow'
                : `Due in ${data.upcomingBill.dueInDays} days`}
          </Text>
        </View>
      ) : null}

      {data.recentConversation ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue your recent conversation"
          onPress={() => router.push('./chat')}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.cardLabel}>Continue where you left off</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
          <Text style={styles.cardValue} numberOfLines={1}>
            {data.recentConversation.title}
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.quickTitle}>Quick actions</Text>
      <View style={styles.quickRow}>
        <QuickAction
          icon="chatbubble-ellipses"
          label="Ask Velunee"
          onPress={() => router.push('./chat')}
        />
        <QuickAction icon="wallet" label="Add expense" onPress={() => router.push('./balance')} />
        <QuickAction icon="shirt" label="What to wear" onPress={() => router.push('/style')} />
        <QuickAction icon="school" label="Study help" onPress={() => router.push('/learn')} />
        <QuickAction icon="calendar" label="Plan my day" onPress={() => router.push('/planner')} />
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.quickAction}
    >
      <Ionicons name={icon} size={22} color={colors.primaryLight} />
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function CardSettingsModal({
  visible,
  cards,
  onClose,
}: {
  visible: boolean;
  cards: HomeCardPreferences | null;
  onClose: () => void;
}): React.JSX.Element {
  const updateCards = useUpdateHomeCards();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Home cards</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.modalHint}>Choose what appears on your home screen.</Text>

          {cards
            ? (Object.keys(CARD_LABELS) as Array<keyof HomeCardPreferences>).map((key) => (
                <View key={key} style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{CARD_LABELS[key]}</Text>
                  <Switch
                    value={cards[key]}
                    onValueChange={(value) => updateCards.mutate({ [key]: value })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              ))
            : null}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  settingsButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retry: {
    marginTop: 12,
    alignSelf: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  greeting: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  decideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  decideCtaText: {
    flex: 1,
    gap: 2,
  },
  decideCtaTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  decideCtaBody: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  cardValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  cardAdvice: {
    color: colors.primaryLight,
    fontSize: 13,
  },
  quickTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 6,
  },
  quickLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 6, 20, 0.7)',
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 15,
  },
});
