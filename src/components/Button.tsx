// Bouton d'action générique (3 variantes visuelles) — agnostique, piloté par props.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, goldGradient, opacity, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dashed';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
};

export default function Button({ label, onPress, disabled, variant = 'primary' }: Props) {
  const content = (
    <Text style={[styles.text, variantStyles[variant].text]}>{label}</Text>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <LinearGradient colors={goldGradient} style={styles.base}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  text: { fontSize: 18, fontWeight: '800' },
  disabled: { opacity: opacity.disabled },
  pressed: { opacity: opacity.pressed },
});

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.gold },
    text: { color: colors.bg },
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.text, fontSize: 16, fontWeight: '700' },
  }),
  ghost: StyleSheet.create({
    container: { paddingVertical: spacing.md },
    text: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  }),
  dashed: StyleSheet.create({
    container: {
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    text: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  }),
};
