import { Text, View } from 'react-native';

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: SectionTitleProps): React.JSX.Element {
  return (
    <View className="mb-5">
      {eyebrow ? (
        <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-secondary">
          {eyebrow}
        </Text>
      ) : null}
      <Text className="text-3xl font-black leading-9 text-ink">{title}</Text>
      {description ? (
        <Text className="mt-2 text-base leading-6 text-muted">{description}</Text>
      ) : null}
    </View>
  );
}
