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
import type { HomeCardPreferences, HomeOverviewResponse, PlannerTask } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { formatMinor } from '@/features/balance/format';
import { useHomeOverview, useUpdateHomeCards } from '@/features/home/use-home';
import { usePlannerDay } from '@/features/planner/use-planner';
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
  const router = useRouter();
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
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={10}
            onPress={() => router.push('/notifications')}
            style={styles.settingsButton}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </Pressable>
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
  const planner = usePlannerDay();
  const [briefExplained, setBriefExplained] = useState(false);

  const nextTask = planner.data
    ? ([...planner.data.overdue, ...planner.data.tasks].find((task) => task.status === 'todo') ??
      null)
    : null;
  const brief = buildDailyBrief(data, nextTask);
  const bestAction = buildBestAction(data, nextTask);
  const connectedCount = [data.weather, nextTask, data.upcomingBill, data.balance].filter(
    Boolean,
  ).length;

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

      <View style={styles.briefCard}>
        <View style={styles.briefAccent} />
        <View style={styles.briefHeader}>
          <View style={styles.briefTitleRow}>
            <View style={styles.briefIcon}>
              <Ionicons name="sparkles" size={18} color={colors.white} />
            </View>
            <View>
              <Text style={styles.briefEyebrow}>VELUNEE DAILY BRIEF</Text>
              <Text style={styles.briefTitle}>What matters today</Text>
            </View>
          </View>
          {connectedCount > 0 ? (
            <View style={styles.connectedPill}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>{connectedCount} connected</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.briefSummary}>{brief}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contextRail}
          style={styles.contextScroller}
        >
          {data.weather ? (
            <ContextTile
              icon="rainy-outline"
              label="Weather"
              value={`${data.weather.temperatureC}°C${
                data.weather.condition ? ` · ${data.weather.condition}` : ''
              }`}
            />
          ) : null}
          {nextTask ? (
            <ContextTile
              icon="time-outline"
              label={nextTask.scheduledTime ? taskTime(nextTask) : 'Today'}
              value={nextTask.title}
              onPress={() => router.push('/planner')}
            />
          ) : null}
          {data.upcomingBill ? (
            <ContextTile
              icon="receipt-outline"
              label={billDueLabel(data.upcomingBill.dueInDays)}
              value={`${data.upcomingBill.name} · ${formatMinor(
                data.upcomingBill.currency,
                data.upcomingBill.amountMinor,
              )}`}
              onPress={() => router.push('./balance')}
            />
          ) : null}
          {data.balance ? (
            <ContextTile
              icon="wallet-outline"
              label="Safe to spend"
              value={
                data.balance.isConfigured
                  ? formatMinor(data.balance.currency, data.balance.safeToSpendTodayMinor)
                  : 'Set up Balance'
              }
              onPress={() => router.push('./balance')}
            />
          ) : null}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: briefExplained }}
          onPress={() => setBriefExplained((current) => !current)}
          style={styles.whyButton}
        >
          <Ionicons name="information-circle-outline" size={17} color={colors.primaryLight} />
          <Text style={styles.whyText}>Why this brief?</Text>
          <Ionicons
            name={briefExplained ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </Pressable>
        {briefExplained ? (
          <Text style={styles.whyAnswer}>
            Velunee connected today&apos;s weather, open plan, upcoming bill and available spending.
            You control these topics from the Home options button.
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${bestAction.title}. ${bestAction.label}`}
        onPress={() => router.push(bestAction.route)}
        style={({ pressed }) => [styles.nextActionCard, pressed ? styles.pressed : null]}
      >
        <View style={styles.nextActionHeader}>
          <View style={styles.nextActionIcon}>
            <Ionicons name="navigate" size={18} color={colors.primaryLight} />
          </View>
          <View style={styles.nextActionCopy}>
            <Text style={styles.nextActionEyebrow}>BEST NEXT ACTION</Text>
            <Text style={styles.nextActionTitle}>{bestAction.title}</Text>
            <Text style={styles.nextActionBody} numberOfLines={2}>
              {bestAction.body}
            </Text>
          </View>
          <View style={styles.nextActionAccessory}>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </View>
        </View>
        <Text style={styles.nextActionLink}>{bestAction.label}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Velunee to help you decide"
        onPress={() => router.push('/decide')}
        style={styles.decideCta}
      >
        <Ionicons name="git-compare-outline" size={20} color={colors.white} />
        <View style={styles.decideCtaText}>
          <Text style={styles.decideCtaTitle}>Help me decide</Text>
          <Text style={styles.decideCtaBody}>Compare a choice using today&apos;s context.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.white} />
      </Pressable>

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        <QuickAction
          icon="chatbubble-ellipses"
          label="Ask Velunee"
          onPress={() => router.push('./chat')}
        />
        <QuickAction icon="wallet" label="Add expense" onPress={() => router.push('./balance')} />
        <QuickAction icon="shirt" label="What to wear" onPress={() => router.push('/style')} />
        <QuickAction icon="school" label="Study help" onPress={() => router.push('/learn')} />
        <QuickAction icon="calendar" label="Plan my day" onPress={() => router.push('/planner')} />
      </ScrollView>
    </ScrollView>
  );
}

function taskTime(task: PlannerTask): string {
  if (!task.scheduledTime) return 'Today';
  const [hour, minute] = task.scheduledTime.split(':').map(Number) as [number, number];
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function billDueLabel(dueInDays: number): string {
  if (dueInDays === 0) return 'Due today';
  if (dueInDays === 1) return 'Due tomorrow';
  return `Due in ${dueInDays} days`;
}

function buildDailyBrief(data: HomeOverviewResponse, nextTask: PlannerTask | null): string {
  const parts: string[] = [];

  if (data.weather) {
    const rainy =
      /rain|drizzle|thunder|shower/i.test(data.weather.condition ?? '') ||
      /rain|umbrella/i.test(data.weather.advice ?? '');
    if (rainy) {
      parts.push('Rain may affect your day. Take an umbrella.');
    } else if (data.weather.advice) {
      parts.push(data.weather.advice);
    } else {
      parts.push(
        `It is ${data.weather.temperatureC}°C${
          data.weather.condition ? ` and ${data.weather.condition.toLowerCase()}` : ''
        } in ${data.weather.locationName}.`,
      );
    }
  }

  if (data.upcomingBill && data.upcomingBill.dueInDays <= 1) {
    parts.push(
      `${data.upcomingBill.name} is ${billDueLabel(data.upcomingBill.dueInDays).toLowerCase()}.`,
    );
  } else if (nextTask) {
    parts.push(
      nextTask.scheduledTime
        ? `Next: “${nextTask.title}” at ${taskTime(nextTask)}.`
        : `Next: “${nextTask.title}”.`,
    );
  } else if (data.upcomingBill) {
    parts.push(
      `${data.upcomingBill.name} is ${billDueLabel(data.upcomingBill.dueInDays).toLowerCase()}.`,
    );
  } else if (data.balance?.isConfigured) {
    parts.push(
      `${formatMinor(
        data.balance.currency,
        data.balance.safeToSpendTodayMinor,
      )} is safe to spend today.`,
    );
  }

  return parts.length > 0
    ? parts.join(' ')
    : 'Add a plan, Balance details or location access and Velunee will connect your day here.';
}

function buildBestAction(
  data: HomeOverviewResponse,
  nextTask: PlannerTask | null,
): {
  title: string;
  body: string;
  label: string;
  route: '/planner' | './balance' | '/style' | './chat';
} {
  if (data.upcomingBill && data.upcomingBill.dueInDays <= 1) {
    return {
      title: `Prepare ${data.upcomingBill.name}`,
      body: `${formatMinor(data.upcomingBill.currency, data.upcomingBill.amountMinor)} is ${billDueLabel(
        data.upcomingBill.dueInDays,
      ).toLowerCase()}. Check your plan before other spending.`,
      label: 'Review Balance',
      route: './balance',
    };
  }

  if (nextTask) {
    return {
      title: nextTask.scheduledTime
        ? `Be ready for ${taskTime(nextTask)}`
        : 'Choose your first task',
      body: `Focus on “${nextTask.title}” next. Velunee will keep the rest of your day visible.`,
      label: 'Open Planner',
      route: '/planner',
    };
  }

  if (data.weather?.advice) {
    return {
      title: 'Get ready for the weather',
      body: data.weather.advice,
      label: 'What should I wear?',
      route: '/style',
    };
  }

  if (data.balance?.isConfigured) {
    return {
      title: 'Keep spending on track',
      body:
        data.suggestion?.message ??
        `Stay within ${formatMinor(
          data.balance.currency,
          data.balance.safeToSpendTodayMinor,
        )} today.`,
      label: 'Review Balance',
      route: './balance',
    };
  }

  return {
    title: 'Shape your day with Velunee',
    body:
      data.suggestion?.message ??
      'Tell Velunee what is on your mind and choose a useful next step.',
    label: 'Ask Velunee',
    route: './chat',
  };
}

function ContextTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.contextTile, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.contextTileHeader}>
        <View style={styles.contextIcon}>
          <Ionicons name={icon} size={15} color={colors.primaryLight} />
        </View>
        <Text style={styles.contextTileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.contextTileValue} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
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
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={colors.primaryLight} />
      </View>
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
    paddingTop: 8,
    paddingBottom: 9,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
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
    paddingBottom: 24,
    gap: 10,
  },
  greeting: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  briefCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(180, 150, 255, 0.34)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    paddingTop: 17,
    gap: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  briefAccent: {
    position: 'absolute',
    top: 0,
    left: 34,
    right: 34,
    height: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.primaryLight,
    opacity: 0.75,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  briefTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  briefIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.primary,
  },
  briefEyebrow: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  briefTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 11, 31, 0.52)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  connectedText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  briefSummary: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  contextScroller: {
    marginHorizontal: -15,
  },
  contextRail: {
    paddingHorizontal: 15,
    gap: 8,
  },
  contextTile: {
    width: 126,
    minHeight: 58,
    backgroundColor: 'rgba(15, 11, 31, 0.58)',
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  contextTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: 'rgba(121, 87, 217, 0.16)',
  },
  contextTileLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  contextTileValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  whyText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  whyAnswer: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -6,
  },
  nextActionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    gap: 5,
  },
  nextActionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  nextActionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
  },
  nextActionCopy: {
    flex: 1,
    gap: 3,
  },
  nextActionEyebrow: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.75,
  },
  nextActionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  nextActionBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  nextActionAccessory: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
  nextActionLink: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 44,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  decideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 13,
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
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quickRow: {
    gap: 9,
    paddingRight: 20,
  },
  quickAction: {
    width: 96,
    minHeight: 76,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 5,
  },
  quickIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
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
