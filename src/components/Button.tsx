// Bouton d'action générique (charte-da.md §06) — agnostique, piloté par props.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { alpha, colors, fonts, opacity, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'dashed';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
};

export default function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        pressed && !disabled && variantStyles[variant].pressedContainer,
        disabled && styles.disabled,
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.text,
            variantStyles[variant].text,
            pressed && !disabled && variantStyles[variant].pressedText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.s18,
    alignItems: 'center',
  },
  text: {
    fontFamily: fonts.displayBlack,
    fontSize: 24,
    letterSpacing: 24 * 0.05,
    textTransform: 'uppercase',
  },
  disabled: { opacity: opacity.disabled },
});

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.sanguine },
    pressedContainer: { backgroundColor: colors.sanguineHover },
    text: { color: colors.fond },
    pressedText: {},
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: alpha.creme(0.32),
    },
    pressedContainer: { borderColor: colors.creme },
    text: { color: colors.creme },
    pressedText: {},
  }),
  destructive: StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: alpha.grenat(0.5),
    },
    pressedContainer: {
      backgroundColor: colors.grenat,
      borderColor: colors.grenat,
    },
    text: { color: colors.grenat },
    pressedText: { color: colors.fond },
  }),
  dashed: StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: alpha.creme(0.24),
    },
    pressedContainer: { borderColor: colors.sanguine, borderStyle: 'dashed' },
    text: { color: alpha.creme(0.6), fontSize: 15, letterSpacing: 15 * 0.12 },
    pressedText: { color: colors.sanguine },
  }),
};
