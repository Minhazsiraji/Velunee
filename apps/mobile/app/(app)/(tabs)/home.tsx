import { Ionicons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeCardPreferences, HomeOverviewResponse, PlannerTask } from '@velunee/contracts';

import { PrimaryButton } from '@/components/primary-button';
import { useAccountOverview } from '@/features/account/use-account';
import { useHomeOverview, useUpdateHomeCards } from '@/features/home/use-home';
import {
  buildTaskTimings,
  selectBestTaskTiming,
  tomorrowIso,
  type TaskTiming,
} from '@/features/home/task-lifecycle';
import {
  deriveHomeTrustState,
  isLikelyOfflineError,
  type HomeTrustStatus,
} from '@/features/home/trust-state';
import { useDeleteTask, usePlannerDay, useUpdateTask } from '@/features/planner/use-planner';
import { useAuth } from '@/providers/auth-provider';
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
  const account = useAccountOverview();
  const auth = useAuth();
  const router = useRouter();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refreshClock = (): void => setNow(new Date());
    const timer = setInterval(refreshClock, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshClock();
      void overview.refetch();
      void account.refetch();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [account.refetch, overview.refetch]);

  function renderBody(): React.JSX.Element {
    if (overview.isLoading && !overview.data) {
      return <HomeSkeleton />;
    }

    if (!overview.data) {
      const offline = isLikelyOfflineError(overview.error);
      return (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.stateTitle}>
            {offline ? 'You’re offline' : 'Couldn’t load your day'}
          </Text>
          <Text style={styles.stateBody}>
            {offline
              ? 'Reconnect to load your latest Daily Brief. Nothing old is being shown as live.'
              : 'Your information is temporarily unavailable. Try again to load the latest version.'}
          </Text>
          <PrimaryButton
            label={overview.isFetching ? 'Retrying…' : 'Retry'}
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
        updatedAt={overview.dataUpdatedAt}
        now={now}
        greetingName={resolveGreetingName(
          account.data?.profile.displayName,
          auth.user?.user_metadata,
          auth.isAnonymous ? null : auth.user?.email,
        )}
        overviewError={overview.isRefetchError ? overview.error : null}
        refreshing={overview.isRefetching || account.isRefetching}
        onRefresh={async () => {
          await Promise.allSettled([overview.refetch(), account.refetch()]);
        }}
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
  updatedAt,
  now,
  greetingName,
  overviewError,
  refreshing,
  onRefresh,
}: {
  data: HomeOverviewResponse;
  updatedAt: number;
  now: Date;
  greetingName: string | null;
  overviewError: unknown;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}): React.JSX.Element {
  const router = useRouter();
  const planner = usePlannerDay();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [briefExplained, setBriefExplained] = useState(false);
  const [overdueTask, setOverdueTask] = useState<PlannerTask | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isNarrow = width < 340;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void planner.refetch();
    });
    return () => subscription.remove();
  }, [planner.refetch]);

  const taskTimings = planner.data
    ? buildTaskTimings([...planner.data.overdue, ...planner.data.tasks], now)
    : [];
  const bestTaskTiming = selectBestTaskTiming(taskTimings);
  const staleOverdue = taskTimings.filter((timing) => timing.state === 'stale-overdue');
  const plannerSignal = bestTaskTiming ?? staleOverdue[0] ?? null;
  const brief = buildDailyBrief(data, bestTaskTiming, staleOverdue.length);
  const bestAction = buildBestAction(data, bestTaskTiming);
  const liveSignals = [
    data.weather ? 'Weather' : null,
    plannerSignal ? 'Planner' : null,
    data.upcomingBill ? 'Bills' : null,
    data.balance ? 'Balance' : null,
  ].filter((signal): signal is string => Boolean(signal));
  const connectedCount = liveSignals.length;
  const updatedTimestamps = [updatedAt, planner.data ? planner.dataUpdatedAt : 0].filter(
    (timestamp) => timestamp > 0,
  );
  const lastSuccessfulUpdate =
    updatedTimestamps.length > 0 ? Math.min(...updatedTimestamps) : updatedAt;
  const trustState = deriveHomeTrustState({
    now: now.getTime(),
    updatedAt: lastSuccessfulUpdate,
    errors: [overviewError, planner.isError ? planner.error : null],
  });
  const signalsAreLive = trustState.status === 'fresh';

  async function refreshAll(): Promise<void> {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      await Promise.allSettled([onRefresh(), planner.refetch()]);
    } finally {
      setPullRefreshing(false);
    }
  }

  async function resolveOverdue(action: 'complete' | 'tomorrow' | 'skip'): Promise<void> {
    if (!overdueTask) return;

    try {
      if (action === 'complete') {
        await updateTask.mutateAsync({
          taskId: overdueTask.id,
          patch: { status: 'done' },
        });
      } else if (action === 'tomorrow') {
        await updateTask.mutateAsync({
          taskId: overdueTask.id,
          patch: { dueOn: tomorrowIso(now) },
        });
      } else {
        await deleteTask.mutateAsync(overdueTask.id);
      }
      setOverdueTask(null);
    } catch (error) {
      Alert.alert(
        'Could not update task',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  function openBestAction(): void {
    if (bestAction.timing?.state === 'recent-overdue') {
      setOverdueTask(bestAction.timing.task);
      return;
    }
    router.push(bestAction.route);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.list, isCompact ? styles.listCompact : null]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing || refreshing || planner.isRefetching}
            onRefresh={() => void refreshAll()}
            tintColor={colors.primaryLight}
          />
        }
      >
        <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
          {homeGreeting(now, greetingName)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
          {data.greeting.subtitle ?? formatHomeDate(now)}
        </Text>

        <HomeTrustBanner
          status={trustState.status}
          updatedAt={lastSuccessfulUpdate}
          refreshing={pullRefreshing || refreshing || planner.isRefetching}
          onRetry={() => void refreshAll()}
        />

        <View style={[styles.briefCard, isCompact ? styles.briefCardCompact : null]}>
          <View pointerEvents="none" style={styles.briefGlow} />
          <View style={styles.briefAccent} />
          <View style={styles.briefHeader}>
            <View style={styles.briefIcon}>
              <Ionicons name="sparkles" size={18} color={colors.white} />
            </View>
            <View style={styles.briefHeaderCopy}>
              <Text style={styles.briefEyebrow} numberOfLines={1} ellipsizeMode="tail">
                VELUNEE DAILY BRIEF
              </Text>
              <Text style={styles.briefTitle} numberOfLines={1} ellipsizeMode="tail">
                What matters today
              </Text>
            </View>
            {connectedCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${connectedCount} ${
                  signalsAreLive ? 'live' : 'saved'
                } signals. Show how this brief was created.`}
                accessibilityState={{ expanded: briefExplained }}
                hitSlop={6}
                onPress={() => setBriefExplained((current) => !current)}
                style={({ pressed }) => [styles.connectedPill, pressed ? styles.pressed : null]}
              >
                <View
                  style={[styles.connectedDot, !signalsAreLive ? styles.connectedDotSaved : null]}
                />
                <Text style={styles.connectedText} numberOfLines={1}>
                  {connectedCount} {signalsAreLive ? 'live' : 'saved'} signals
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.briefSummary} numberOfLines={3} ellipsizeMode="tail">
            {brief}
          </Text>

          <View style={[styles.contextGrid, isNarrow ? styles.contextGridNarrow : null]}>
            {data.weather ? (
              <ContextTile
                icon="rainy-outline"
                label="Weather"
                value={`${data.weather.temperatureC}°C${
                  data.weather.condition ? ` · ${data.weather.condition}` : ''
                }`}
                fullWidth={isNarrow}
              />
            ) : null}
            {plannerSignal ? (
              <ContextTile
                icon={
                  plannerSignal.state.includes('overdue') ? 'alert-circle-outline' : 'time-outline'
                }
                label={taskSignalLabel(plannerSignal, staleOverdue.length)}
                value={plannerSignal.task.title}
                onPress={() => router.push('/planner')}
                fullWidth={isNarrow}
              />
            ) : null}
          </View>

          {data.upcomingBill || data.balance ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review upcoming bill and safe-to-spend amount"
              onPress={() => router.push('./balance')}
              style={({ pressed }) => [styles.moneySignal, pressed ? styles.pressed : null]}
            >
              {data.upcomingBill ? (
                <MoneySignalLine
                  icon="receipt-outline"
                  label={billDueLabel(data.upcomingBill.dueInDays)}
                  value={`${data.upcomingBill.name} · ${formatHomeMoney(
                    data.upcomingBill.currency,
                    data.upcomingBill.amountMinor,
                  )}`}
                  stacked={isNarrow}
                />
              ) : null}
              {data.upcomingBill && data.balance ? (
                <View
                  style={[
                    styles.moneySignalDivider,
                    isNarrow ? styles.moneySignalDividerNarrow : null,
                  ]}
                />
              ) : null}
              {data.balance ? (
                <MoneySignalLine
                  icon="wallet-outline"
                  label="Safe to spend today"
                  value={
                    data.balance.isConfigured
                      ? formatHomeMoney(data.balance.currency, data.balance.safeToSpendTodayMinor)
                      : 'Set up Balance'
                  }
                  stacked={isNarrow}
                />
              ) : null}
            </Pressable>
          ) : null}

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
              Using {liveSignals.join(', ')} ·{' '}
              {signalsAreLive ? 'Updated' : 'Last successful update'}{' '}
              {formatUpdatedTime(lastSuccessfulUpdate)}. These signals stay private to your account
              and are used only to prepare your brief. Control them from Home options.
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${bestAction.title}. ${bestAction.label}`}
          onPress={openBestAction}
          style={({ pressed }) => [styles.nextActionCard, pressed ? styles.pressed : null]}
        >
          <View style={styles.nextActionHeader}>
            <View style={styles.nextActionIcon}>
              <Ionicons name="navigate" size={18} color={colors.primaryLight} />
            </View>
            <View style={styles.nextActionCopy}>
              <Text style={styles.nextActionEyebrow}>BEST NEXT ACTION</Text>
              <Text style={styles.nextActionTitle} numberOfLines={1} ellipsizeMode="tail">
                {bestAction.title}
              </Text>
              <Text style={styles.nextActionBody} numberOfLines={2} ellipsizeMode="tail">
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
          <QuickAction
            icon="calendar"
            label="Plan my day"
            onPress={() => router.push('/planner')}
          />
        </ScrollView>

        {data.recentConversation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continue recent conversation: ${data.recentConversation.title}`}
            onPress={() => router.push('./chat')}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.cardLabel} numberOfLines={1} ellipsizeMode="tail">
                Recent conversation
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">
              {data.recentConversation.title}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1} ellipsizeMode="tail">
              Continue your conversation ·{' '}
              {formatConversationAge(data.recentConversation.updatedAt)}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <OverdueTaskModal
        task={overdueTask}
        pending={updateTask.isPending || deleteTask.isPending}
        onClose={() => setOverdueTask(null)}
        onResolve={(action) => void resolveOverdue(action)}
      />
    </>
  );
}

function HomeSkeleton(): React.JSX.Element {
  return (
    <View
      accessibilityLabel="Loading your latest Home information"
      accessibilityRole="progressbar"
      style={styles.skeletonList}
    >
      <View style={[styles.skeletonBlock, styles.skeletonGreeting]} />
      <View style={[styles.skeletonBlock, styles.skeletonDate]} />
      <View style={[styles.skeletonBlock, styles.skeletonBrief]} />
      <View style={[styles.skeletonBlock, styles.skeletonAction]} />
      <View style={[styles.skeletonBlock, styles.skeletonCta]} />
      <View style={styles.skeletonQuickRow}>
        <View style={[styles.skeletonBlock, styles.skeletonQuick]} />
        <View style={[styles.skeletonBlock, styles.skeletonQuick]} />
        <View style={[styles.skeletonBlock, styles.skeletonQuick]} />
      </View>
    </View>
  );
}

function HomeTrustBanner({
  status,
  updatedAt,
  refreshing,
  onRetry,
}: {
  status: HomeTrustStatus;
  updatedAt: number;
  refreshing: boolean;
  onRetry: () => void;
}): React.JSX.Element | null {
  if (status === 'fresh') return null;

  const title =
    status === 'offline'
      ? refreshing
        ? 'Trying to reconnect…'
        : 'You’re offline'
      : status === 'stale'
        ? refreshing
          ? 'Refreshing your day…'
          : 'Information may be outdated'
        : refreshing
          ? 'Retrying the update…'
          : 'Couldn’t refresh every signal';
  const body =
    status === 'offline'
      ? `Showing saved information from ${formatUpdateAge(updatedAt)}. It is not marked as live.`
      : status === 'stale'
        ? `Last updated ${formatUpdateAge(updatedAt)}. Refresh before relying on time-sensitive information.`
        : `Showing the last successful update from ${formatUpdateAge(updatedAt)}. Some information may be unavailable.`;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${body}`}
      style={styles.trustBanner}
    >
      <Ionicons
        name={status === 'offline' ? 'cloud-offline-outline' : 'time-outline'}
        size={20}
        color={colors.primaryLight}
      />
      <View style={styles.trustBannerCopy}>
        <Text style={styles.trustBannerTitle}>{title}</Text>
        <Text style={styles.trustBannerBody}>{body}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={refreshing ? 'Refreshing Home' : 'Refresh Home now'}
        disabled={refreshing}
        onPress={onRetry}
        style={({ pressed }) => [
          styles.trustRetry,
          refreshing ? styles.trustRetryDisabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={colors.primaryLight} />
        ) : (
          <Text style={styles.trustRetryText}>Refresh</Text>
        )}
      </Pressable>
    </View>
  );
}

function cleanFirstName(value: string | null | undefined): string | null {
  const first = value
    ?.trim()
    .split(/\s+/)[0]
    ?.replace(/[^\p{L}\p{N}'-]/gu, '');
  if (!first) return null;
  return `${first.charAt(0).toLocaleUpperCase()}${first.slice(1)}`;
}

function resolveGreetingName(
  profileName: string | null | undefined,
  metadata: Record<string, unknown> | undefined,
  email: string | null | undefined,
): string | null {
  const metadataName = ['display_name', 'full_name', 'name']
    .map((key) => metadata?.[key])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const emailName = email?.split('@')[0]?.replace(/[._-]+/g, ' ');
  return cleanFirstName(profileName) ?? cleanFirstName(metadataName) ?? cleanFirstName(emailName);
}

function homeGreeting(now: Date, name: string | null): string {
  const hour = now.getHours();
  const greeting =
    hour < 5 ? 'Hello' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name}` : greeting;
}

function taskTime(task: PlannerTask): string {
  if (!task.scheduledTime) return 'Today';
  const [hour, minute] = task.scheduledTime.split(':').map(Number) as [number, number];
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function overdueMinutes(timing: TaskTiming): number {
  return Math.max(1, Math.abs(timing.minutesFromNow ?? 0));
}

function taskSignalLabel(timing: TaskTiming, staleOverdueCount: number): string {
  switch (timing.state) {
    case 'due-now':
      return 'Due now';
    case 'recent-overdue':
      return `${overdueMinutes(timing)} min overdue`;
    case 'stale-overdue':
      return `${staleOverdueCount} overdue ${staleOverdueCount === 1 ? 'task' : 'tasks'}`;
    case 'preparing':
      return 'Prepare now';
    case 'upcoming':
      return taskTime(timing.task);
    case 'untimed':
      return 'Today';
  }
}

function formatHomeDate(date: Date): string {
  return new Intl.DateTimeFormat(getLocales()[0]?.languageTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatUpdatedTime(timestamp: number): string {
  return new Intl.DateTimeFormat(getLocales()[0]?.languageTag, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatUpdateAge(timestamp: number): string {
  if (timestamp <= 0) return 'an unknown time';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hr ago`;
  return formatUpdatedTime(timestamp);
}

function formatConversationAge(value: string): string {
  const timestamp = new Date(value).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  const locale = getLocales()[0]?.languageTag;

  try {
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (elapsedMinutes < 1) return 'just now';
    if (elapsedMinutes < 60) return relative.format(-elapsedMinutes, 'minute');
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return relative.format(-elapsedHours, 'hour');
    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays < 7) return relative.format(-elapsedDays, 'day');
  } catch {
    // Fall through to a locale-aware calendar date on limited Intl runtimes.
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(new Date(value));
}

function taskPreparationTime(task: PlannerTask): string | null {
  if (!task.scheduledTime) return null;
  const [hour, minute] = task.scheduledTime.split(':').map(Number) as [number, number];
  const preparation = new Date(2000, 0, 1, hour, minute);
  preparation.setMinutes(preparation.getMinutes() - 15);
  return preparation.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function taskActionTitle(title: string): string {
  const action = title.trim().replace(/^(?:i\s+)?need\s+to\s+/i, '');
  if (!action) return 'Open your next task';
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
}

function weatherActionNudge(data: HomeOverviewResponse): string | null {
  if (!data.weather) return null;
  const rainy =
    /rain|drizzle|thunder|shower/i.test(data.weather.condition ?? '') ||
    /rain|umbrella/i.test(data.weather.advice ?? '');
  if (!rainy) return null;
  return 'Rain is possible, so take an umbrella.';
}

function formatHomeMoney(currency: string, amountMinor: number): string {
  const locale = getLocales()[0]?.languageTag;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    const amount = (amountMinor / 100).toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${currency} ${amount}`;
  }
}

function billDueLabel(dueInDays: number): string {
  if (dueInDays === 0) return 'Due today';
  if (dueInDays === 1) return 'Due tomorrow';
  return `Due in ${dueInDays} days`;
}

function buildDailyBrief(
  data: HomeOverviewResponse,
  taskTiming: TaskTiming | null,
  staleOverdueCount: number,
): string {
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

  if (taskTiming?.state === 'due-now') {
    parts.push(`“${taskTiming.task.title}” is due now.`);
  } else if (taskTiming?.state === 'recent-overdue') {
    parts.push(`“${taskTiming.task.title}” is ${overdueMinutes(taskTiming)} minutes overdue.`);
  } else if (taskTiming?.state === 'preparing') {
    parts.push(`Prepare now for “${taskTiming.task.title}” at ${taskTime(taskTiming.task)}.`);
  } else if (data.upcomingBill && data.upcomingBill.dueInDays <= 1) {
    parts.push(
      `${data.upcomingBill.name} is ${billDueLabel(data.upcomingBill.dueInDays).toLowerCase()}.`,
    );
  } else if (taskTiming) {
    parts.push(
      taskTiming.task.scheduledTime
        ? `Next: “${taskTiming.task.title}” at ${taskTime(taskTiming.task)}.`
        : `Next: “${taskTiming.task.title}”.`,
    );
  } else if (data.upcomingBill) {
    parts.push(
      `${data.upcomingBill.name} is ${billDueLabel(data.upcomingBill.dueInDays).toLowerCase()}.`,
    );
  } else if (data.balance?.isConfigured) {
    parts.push(
      `${formatHomeMoney(
        data.balance.currency,
        data.balance.safeToSpendTodayMinor,
      )} is safe to spend today.`,
    );
  }

  if (staleOverdueCount > 0) {
    parts.push(
      `${staleOverdueCount} older ${staleOverdueCount === 1 ? 'task needs' : 'tasks need'} review.`,
    );
  }

  return parts.length > 0
    ? parts.join(' ')
    : 'Add a plan, Balance details or location access and Velunee will connect your day here.';
}

interface BestAction {
  title: string;
  body: string;
  label: string;
  route: '/planner' | './balance' | '/style' | './chat';
  timing: TaskTiming | null;
}

function taskBestAction(data: HomeOverviewResponse, timing: TaskTiming): BestAction {
  const weatherNudge = weatherActionNudge(data);
  const taskTitle = taskActionTitle(timing.task.title);

  if (timing.state === 'recent-overdue') {
    return {
      title: `${taskTitle} is overdue`,
      body: `${overdueMinutes(timing)} minutes overdue. Did you complete it? Tap to complete, reschedule, or skip.`,
      label: 'Review overdue task',
      route: '/planner',
      timing,
    };
  }

  if (timing.state === 'due-now') {
    return {
      title: `Due now: ${taskTitle}`,
      body: ['Start now or open Planner to update it.', weatherNudge].filter(Boolean).join(' '),
      label: 'Open Planner',
      route: '/planner',
      timing,
    };
  }

  if (timing.state === 'preparing') {
    return {
      title: taskTitle,
      body: [`Due at ${taskTime(timing.task)}. Start preparing now.`, weatherNudge]
        .filter(Boolean)
        .join(' '),
      label: 'Open Planner',
      route: '/planner',
      timing,
    };
  }

  const preparationTime = taskPreparationTime(timing.task);
  const guidance = timing.task.scheduledTime
    ? `It is scheduled for ${taskTime(timing.task)}${
        preparationTime ? `; start preparing at ${preparationTime}` : ''
      }.`
    : 'Make this your next focus and mark it complete in Planner.';

  return {
    title: taskTitle,
    body: [guidance, weatherNudge].filter(Boolean).join(' '),
    label: 'Open Planner',
    route: '/planner',
    timing,
  };
}

function buildBestAction(data: HomeOverviewResponse, taskTiming: TaskTiming | null): BestAction {
  if (taskTiming && ['recent-overdue', 'due-now', 'preparing'].includes(taskTiming.state)) {
    return taskBestAction(data, taskTiming);
  }

  if (data.upcomingBill && data.upcomingBill.dueInDays <= 1) {
    return {
      title: `Prepare ${data.upcomingBill.name}`,
      body: `${formatHomeMoney(data.upcomingBill.currency, data.upcomingBill.amountMinor)} is ${billDueLabel(
        data.upcomingBill.dueInDays,
      ).toLowerCase()}. Check your plan before other spending.`,
      label: 'Review Balance',
      route: './balance',
      timing: null,
    };
  }

  if (taskTiming) return taskBestAction(data, taskTiming);

  if (data.weather?.advice) {
    return {
      title: 'Get ready for the weather',
      body: data.weather.advice,
      label: 'What should I wear?',
      route: '/style',
      timing: null,
    };
  }

  if (data.balance?.isConfigured) {
    return {
      title: 'Keep spending on track',
      body:
        data.suggestion?.message ??
        `Stay within ${formatHomeMoney(
          data.balance.currency,
          data.balance.safeToSpendTodayMinor,
        )} today.`,
      label: 'Review Balance',
      route: './balance',
      timing: null,
    };
  }

  return {
    title: 'Shape your day with Velunee',
    body:
      data.suggestion?.message ??
      'Tell Velunee what is on your mind and choose a useful next step.',
    label: 'Ask Velunee',
    route: './chat',
    timing: null,
  };
}

function OverdueTaskModal({
  task,
  pending,
  onClose,
  onResolve,
}: {
  task: PlannerTask | null;
  pending: boolean;
  onClose: () => void;
  onResolve: (action: 'complete' | 'tomorrow' | 'skip') => void;
}): React.JSX.Element {
  return (
    <Modal
      visible={task !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.overdueModalHeading}>
              <Ionicons name="time-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.modalTitle}>Review overdue task</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={pending}
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.overdueModalTask} numberOfLines={2} ellipsizeMode="tail">
            {task?.title}
          </Text>
          <Text style={styles.modalHint}>
            Tell Velunee what happened so your Daily Brief can move to the right next action.
          </Text>

          <View style={styles.overdueActions}>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => onResolve('complete')}
              style={({ pressed }) => [
                styles.overdueAction,
                styles.overdueActionPrimary,
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={19} color={colors.white} />
              <Text style={styles.overdueActionPrimaryText}>Mark completed</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => onResolve('tomorrow')}
              style={({ pressed }) => [styles.overdueAction, pressed ? styles.pressed : null]}
            >
              <Ionicons name="calendar-outline" size={19} color={colors.primaryLight} />
              <Text style={styles.overdueActionText}>Reschedule for tomorrow</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => onResolve('skip')}
              style={({ pressed }) => [styles.overdueAction, pressed ? styles.pressed : null]}
            >
              <Ionicons name="play-skip-forward-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.overdueActionText}>Skip this task</Text>
            </Pressable>
          </View>

          {pending ? <ActivityIndicator color={colors.primaryLight} /> : null}
          <Text style={styles.overdueHistoryNote}>
            Skipped tasks leave the active plan but remain in your account history.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function ContextTile({
  icon,
  label,
  value,
  onPress,
  fullWidth = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress?: () => void;
  fullWidth?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.contextTile,
        fullWidth ? styles.contextTileFullWidth : null,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.contextTileHeader}>
        <View style={styles.contextIcon}>
          <Ionicons name={icon} size={15} color={colors.primaryLight} />
        </View>
        <Text style={styles.contextTileLabel} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      </View>
      <Text style={styles.contextTileValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </Pressable>
  );
}

function MoneySignalLine({
  icon,
  label,
  value,
  stacked = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  stacked?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.moneySignalLine, stacked ? styles.moneySignalLineStacked : null]}>
      <View style={[styles.moneySignalLabel, stacked ? styles.moneySignalLabelStacked : null]}>
        <Ionicons name={icon} size={14} color={colors.primaryLight} />
        <Text style={styles.moneySignalLabelText} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      </View>
      <Text
        style={[styles.moneySignalValue, stacked ? styles.moneySignalValueStacked : null]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
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
      <Text style={styles.quickLabel} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
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
    paddingHorizontal: 18,
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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 21,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  skeletonList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 10,
    overflow: 'hidden',
  },
  skeletonBlock: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    opacity: 0.72,
  },
  skeletonGreeting: {
    width: '58%',
    height: 30,
    borderRadius: 10,
  },
  skeletonDate: {
    width: '38%',
    height: 15,
    borderRadius: 7,
  },
  skeletonBrief: {
    width: '100%',
    height: 222,
    borderRadius: 22,
  },
  skeletonAction: {
    width: '100%',
    height: 112,
    borderRadius: 18,
  },
  skeletonCta: {
    width: '100%',
    height: 68,
    borderRadius: 18,
  },
  skeletonQuickRow: {
    flexDirection: 'row',
    gap: 9,
  },
  skeletonQuick: {
    width: 100,
    height: 78,
    borderRadius: 16,
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
  listCompact: {
    paddingHorizontal: 14,
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
  trustBanner: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trustBannerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trustBannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  trustBannerBody: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  trustRetry: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
  },
  trustRetryDisabled: {
    opacity: 0.65,
  },
  trustRetryText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  briefCard: {
    backgroundColor: '#20192F',
    borderColor: 'rgba(180, 150, 255, 0.22)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
    paddingTop: 17,
    gap: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 3,
  },
  briefCardCompact: {
    paddingHorizontal: 12,
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
    opacity: 0.58,
  },
  briefGlow: {
    position: 'absolute',
    top: -72,
    right: -54,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(121, 87, 217, 0.09)',
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  briefHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
    minWidth: 0,
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  briefTitle: {
    minWidth: 0,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  connectedPill: {
    maxWidth: 94,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 11, 31, 0.66)',
    borderColor: 'rgba(180, 150, 255, 0.13)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  connectedDotSaved: {
    backgroundColor: colors.textMuted,
  },
  connectedText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '700',
  },
  briefSummary: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  contextGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  contextGridNarrow: {
    flexDirection: 'column',
  },
  contextTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    backgroundColor: 'rgba(15, 11, 31, 0.48)',
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  contextTileFullWidth: {
    width: '100%',
    flex: 0,
    minHeight: 54,
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
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  contextTileValue: {
    minWidth: 0,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  moneySignal: {
    backgroundColor: 'rgba(15, 11, 31, 0.48)',
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  moneySignalLine: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moneySignalLineStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 4,
  },
  moneySignalLabel: {
    width: 132,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moneySignalLabelStacked: {
    width: '100%',
  },
  moneySignalLabelText: {
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  moneySignalValue: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  moneySignalValueStacked: {
    width: '100%',
    textAlign: 'left',
    paddingLeft: 20,
  },
  moneySignalDivider: {
    height: 1,
    marginLeft: 132,
    backgroundColor: colors.borderSoft,
  },
  moneySignalDividerNarrow: {
    marginLeft: 0,
  },
  pressed: {
    opacity: 0.72,
  },
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 36,
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
    backgroundColor: '#1B1628',
    borderColor: 'rgba(180, 150, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
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
    minWidth: 0,
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
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
  },
  nextActionLink: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 44,
  },
  card: {
    backgroundColor: '#1B1628',
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
    backgroundColor: '#6849C9',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  decideCtaText: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quickRow: {
    gap: 9,
    paddingRight: 20,
  },
  quickAction: {
    width: 100,
    minHeight: 78,
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
    lineHeight: 19,
  },
  overdueModalHeading: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overdueModalTask: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
  },
  overdueActions: {
    gap: 9,
    marginTop: 2,
  },
  overdueAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  overdueActionPrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  overdueActionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  overdueActionPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  overdueHistoryNote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
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
