// Saisie du bonus : boutons rapides −10 / −5 / +5 / +10 ET saisie manuelle au clavier.
// La valeur démarre à 0. Les boutons ajoutent leur montant ; le champ central est éditable.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, opacity, radius, spacing } from '../theme';

type Props = {
  value: number;
  onChange: (value: number) => void;
};

/** Parse un bonus saisi (entier signé) ; 0 si vide/invalide. */
function parseBonus(text: string): number {
  const cleaned = text.replace(/[^0-9-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}

export default function BonusButtons({ value, onChange }: Props) {
  // État texte local pour permettre la saisie manuelle (dont le signe « - »).
  const [text, setText] = useState(value === 0 ? '' : String(value));

  // Reflète les changements externes (boutons, reset) sans gêner la frappe.
  useEffect(() => {
    if (parseBonus(text) !== value) {
      setText(value === 0 ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const apply = (delta: number) => onChange(value + delta);

  const onEdit = (t: string) => {
    setText(t);
    onChange(parseBonus(t));
  };

  return (
    <View style={styles.row}>
      <StepBtn label="−10" tone="neg" onPress={() => apply(-10)} />
      <StepBtn label="−5" tone="neg" onPress={() => apply(-5)} />

      <TextInput
        style={[
          styles.input,
          value > 0 ? styles.pos : value < 0 ? styles.neg : styles.zero,
        ]}
        value={text}
        onChangeText={onEdit}
        keyboardType="numbers-and-punctuation"
        placeholder="0"
        placeholderTextColor={colors.textDim}
        textAlign="center"
        maxLength={5}
        selectTextOnFocus
        accessibilityLabel="Bonus (saisie manuelle)"
      />

      <StepBtn label="+5" tone="pos" onPress={() => apply(5)} />
      <StepBtn label="+10" tone="pos" onPress={() => apply(10)} />
    </View>
  );
}

function StepBtn({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'pos' | 'neg';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`Bonus ${label}`}
      style={({ pressed }) => [
        styles.btn,
        tone === 'pos' ? styles.btnPos : styles.btnNeg,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.btnText, tone === 'pos' ? styles.posText : styles.negText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btn: {
    paddingHorizontal: spacing.sm,
    height: 36,
    minWidth: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNeg: { backgroundColor: 'rgba(239,111,111,0.12)', borderColor: colors.negative },
  btnPos: { backgroundColor: 'rgba(95,208,138,0.12)', borderColor: colors.positive },
  btnText: { fontSize: 14, fontWeight: '800' },
  negText: { color: colors.negative },
  posText: { color: colors.positive },
  pressed: { opacity: opacity.pressedSubtle },
  input: {
    minWidth: 56,
    height: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    marginHorizontal: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bgAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 17,
    fontWeight: '800',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  pos: { color: colors.positive },
  neg: { color: colors.negative },
  zero: { color: colors.text },
});
