import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

interface ChatErrorBannerProps {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ChatErrorBanner({
  message,
  canRetry,
  onRetry,
  onDismiss,
}: ChatErrorBannerProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={19}
        color={colors.danger}
      />

      <View style={styles.content}>
        <Text style={styles.message}>
          {message}
        </Text>

        <View style={styles.actions}>
          {canRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [
                styles.actionButton,
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.actionButton,
              styles.dismissButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.dismissText}>
              Dismiss
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 14,
    backgroundColor: colors.dangerBackground,
  },
  content: {
    flex: 1,
    marginLeft: 9,
  },
  message: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 10,
  },
  retryButton: {
    backgroundColor: '#3A2859',
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
  },
  dismissText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
});
