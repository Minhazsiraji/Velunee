import type { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, type ScrollViewProps, View } from 'react-native';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  contentContainerClassName?: string;
  scrollProps?: ScrollViewProps;
}

export function Screen({
  children,
  scroll = true,
  contentContainerClassName = 'px-5 pb-28 pt-4',
  scrollProps,
}: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={contentContainerClassName}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${contentContainerClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
