// Sélecteur d'entier borné avec boutons − / + (charte-da.md §06, cadre 62 px).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts, opacity } from '../theme';

type Props = {
  value: number | null;
  min: number;
  max: number;
  /** Omis quand `readOnly` est vrai — les boutons ± sont alors masqués. */
  onChange?: (value: number) => void;
  placeholder?: string;
  /** Couleur de la valeur affichée — sanguine (mise) ou paille (plis) selon le champ. */
  accent?: string;
  /** Libellés d'accessibilité des boutons − / + (ex. "Diminuer la mise"). */
  decrementLabel?: string;
  incrementLabel?: string;
  /** Masque les boutons ± et n'affiche que la valeur, même habillage visuel — pour un champ déjà saisi et non modifiable à ce stade. */
  readOnly?: boolean;
};

export default function Stepper({
  value,
  min,
  max,
  onChange,
  placeholder = '—',
  accent = colors.sanguine,
  decrementLabel = 'Diminuer',
  incrementLabel = 'Augmenter',
  readOnly = false,
}: Props) {
  const current = value ?? min;
  const canDec = value != null && current > min;
  const canInc = value == null || current < max;

  const dec = () => {
    if (value == null) onChange?.(min);
    else if (current > min) onChange?.(current - 1);
  };
  const inc = () => {
    if (value == null) onChange?.(min);
    else if (current < max) onChange?.(current + 1);
  };

  return (
    <View style={styles.frame}>
      {!readOnly && (
        <StepBtn
          symbol="−"
          label={decrementLabel}
          enabled={canDec}
          onPress={dec}
          side="right"
        />
      )}
      <View style={styles.valueBox}>
        <Text
          style={[
            styles.value,
            { color: accent },
            value == null && styles.placeholder,
          ]}
        >
          {value == null ? placeholder : value}
        </Text>
      </View>
      {!readOnly && (
        <StepBtn
          symbol="+"
          label={incrementLabel}
          enabled={canInc}
          onPress={inc}
          side="left"
        />
      )}
    </View>
  );
}

function StepBtn({
  symbol,
  label,
  enabled,
  onPress,
  side,
}: {
  symbol: string;
  label: string;
  enabled: boolean;
  onPress: () => void;
  side: 'left' | 'right';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        side === 'right' ? styles.borderRight : styles.borderLeft,
        enabled && pressed && styles.btnPressed,
        !enabled && styles.disabled,
      ]}
    >
      <Text style={styles.btnText}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 62,
    borderWidth: 1,
    borderColor: alpha.creme(0.24),
  },
  btn: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderRight: { borderRightWidth: 1, borderRightColor: alpha.creme(0.24) },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: alpha.creme(0.24) },
  btnPressed: { backgroundColor: alpha.creme(0.08) },
  disabled: { opacity: opacity.disabled },
  btnText: {
    color: colors.creme,
    fontFamily: fonts.displaySemiBold,
    fontSize: 30,
    lineHeight: 30,
  },
  valueBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: {
    fontFamily: fonts.displayBlack,
    fontSize: 42,
    lineHeight: 42,
    fontVariant: ['tabular-nums'],
  },
  placeholder: { color: alpha.creme(0.35) },
});
