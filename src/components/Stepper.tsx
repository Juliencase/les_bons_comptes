// Sélecteur d'entier borné avec boutons - / +.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, opacity, radius, spacing } from '../theme';

type Props = {
  value: number | null;
  min: number;
  max: number;
  onChange: (value: number) => void;
  placeholder?: string;
  accent?: string;
  /** Libellés d'accessibilité des boutons − / + (ex. "Diminuer la mise"). */
  decrementLabel?: string;
  incrementLabel?: string;
};

export default function Stepper({
  value,
  min,
  max,
  onChange,
  placeholder = '—',
  accent = colors.gold,
  decrementLabel = 'Diminuer',
  incrementLabel = 'Augmenter',
}: Props) {
  const current = value ?? min;
  const canDec = value != null && current > min;
  const canInc = value == null || current < max;

  const dec = () => {
    if (value == null) onChange(min);
    else if (current > min) onChange(current - 1);
  };
  const inc = () => {
    if (value == null) onChange(min);
    else if (current < max) onChange(current + 1);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={dec}
        disabled={!canDec}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        style={({ pressed }) => [
          styles.btn,
          { opacity: canDec ? (pressed ? opacity.pressedSubtle : 1) : opacity.disabled },
        ]}
        hitSlop={8}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>

      <View style={[styles.valueBox, { borderColor: accent }]}>
        <Text style={[styles.value, value == null && styles.placeholder]}>
          {value == null ? placeholder : value}
        </Text>
      </View>

      <Pressable
        onPress={inc}
        disabled={!canInc}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        style={({ pressed }) => [
          styles.btn,
          { opacity: canInc ? (pressed ? opacity.pressedSubtle : 1) : opacity.disabled },
        ]}
        hitSlop={8}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 24 },
  valueBox: {
    minWidth: 46,
    height: 38,
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgAlt,
  },
  value: { color: colors.text, fontSize: 18, fontWeight: '700' },
  placeholder: { color: colors.textDim, fontWeight: '400' },
});
