import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { SectionTitle } from '@/components/section-title';

const actions = [
  {
    icon: 'camera' as const,
    title: 'Image advice',
    description: 'Share a private photo and ask for practical guidance.',
    status: 'Next milestone',
  },
  {
    icon: 'notifications' as const,
    title: 'Create reminder',
    description: 'Turn a plan or chat decision into a reminder.',
    status: 'Next milestone',
  },
  {
    icon: 'flag' as const,
    title: 'Create personal goal',
    description: 'Choose a goal and let Velunee help you follow through.',
    status: 'Planned',
  },
  {
    icon: 'people' as const,
    title: 'Community post',
    description: 'Publish only after a separate review and moderation step.',
    status: 'Private beta',
  },
];

export default function CreateScreen(): React.JSX.Element {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Create"
        title="Turn advice into action"
        description="The first coded milestone focuses on useful AI chat. These creation tools are scaffolded for the next releases."
      />
      <View className="gap-4">
        {actions.map((action) => (
          <Pressable
            key={action.title}
            className="flex-row items-center rounded-3xl border border-border bg-surface p-5 active:bg-elevated"
          >
            <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
              <Ionicons name={action.icon} size={27} color="#FF6FB7" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-ink">{action.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">{action.description}</Text>
              <Text className="mt-2 text-xs font-bold uppercase tracking-wider text-primary">
                {action.status}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={21} color="#8E849F" />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
