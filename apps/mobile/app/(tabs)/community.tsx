import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';

export default function CommunityScreen(): React.JSX.Element {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Community"
        title="A safer place to share"
        description="Community is intentionally held behind moderation, reporting, blocking, and age-eligibility work."
      />
      <View className="items-center rounded-[28px] border border-border bg-surface px-6 py-12">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-elevated">
          <Ionicons name="shield-checkmark" size={40} color="#73D9A6" />
        </View>
        <Text className="mt-6 text-center text-2xl font-black text-ink">Moderated from day one</Text>
        <Text className="mt-3 text-center text-base leading-6 text-muted">
          Private AI conversations will never become public posts automatically. Publishing will always be a separate, explicit action.
        </Text>
        <View className="mt-7 w-full gap-3">
          {['Text and image checks', 'Report and block controls', 'Human review for uncertain content'].map(
            (item) => (
              <View key={item} className="flex-row items-center gap-3 rounded-2xl bg-elevated px-4 py-3">
                <Ionicons name="checkmark-circle" size={20} color="#73D9A6" />
                <Text className="flex-1 font-semibold text-ink">{item}</Text>
              </View>
            ),
          )}
        </View>
      </View>
    </Screen>
  );
}
