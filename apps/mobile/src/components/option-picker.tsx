import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

export interface PickerOption<T extends string> {
  value: T;
  label: string;
}

interface OptionPickerProps<T extends string> {
  label: string;
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: OptionPickerProps<T>): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                selected ? styles.chipSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected ? styles.chipTextSelected : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.text,
  },
});
