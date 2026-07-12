import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme/colors';

interface FormFieldProps extends TextInputProps {
  label?: string;
  errorText?: string | null;
  secureToggle?: boolean;
}

export function FormField({
  label,
  errorText,
  secureToggle = false,
  secureTextEntry,
  style,
  ...inputProps
}: FormFieldProps): React.JSX.Element {
  const [isHidden, setIsHidden] = useState(secureToggle ? true : Boolean(secureTextEntry));

  const showToggle = secureToggle;
  const effectiveSecure = secureToggle ? isHidden : secureTextEntry;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, errorText ? styles.inputRowError : null]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primaryLight}
          style={[styles.input, style]}
          secureTextEntry={effectiveSecure}
          {...inputProps}
        />

        {showToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setIsHidden((value) => !value)}
            style={styles.toggle}
          >
            <Ionicons
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: 18,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  inputRowError: {
    borderColor: colors.dangerBorder,
  },
  input: {
    flex: 1,
    height: 52,
    color: colors.text,
    fontSize: 16,
  },
  toggle: {
    paddingLeft: 10,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
