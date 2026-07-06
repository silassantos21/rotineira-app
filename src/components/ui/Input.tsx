import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native'
import { colors } from '../../theme/colors'
import { textStyles, fontFamily } from '../../theme/typography'
import { radius, spacing } from '../../theme/spacing'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  rightIcon?: React.ReactNode
}

export function Input({ label, error, rightIcon, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          !!error && styles.containerError,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.text.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing['1'],
  },
  label: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.body,
  },
  container: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.input,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['4'],
  },
  containerFocused: {
    borderColor: colors.border.focus,
  },
  containerError: {
    borderColor: colors.status.error,
  },
  input: {
    flex: 1,
    ...textStyles.body,
    fontFamily: fontFamily.regular,
    color: colors.text.body,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.status.error,
    fontFamily: fontFamily.regular,
  },
})
