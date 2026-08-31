// Saisie du bonus : paliers −10 / −5 / +5 / +10 dans un seul cadre (charte §06)
// ET saisie manuelle au clavier. La valeur démarre à 0 ; les boutons ajoutent
// leur montant, le champ central reste éditable.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';

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

  const valueColor =
    value > 0 ? colors.paille : value < 0 ? colors.grenat : colors.creme;

  return (
    <View style={styles.frame}>
      <StepBtn
        label="−10"
        tone="neg"
        onPress={() => apply(-10)}
        border="right"
      />
      <StepBtn label="−5" tone="neg" onPress={() => apply(-5)} border="right" />

      <TextInput
        style={[styles.input, { color: valueColor }]}
        value={text}
        onChangeText={onEdit}
        keyboardType="numbers-and-punctuation"
        placeholder="0"
        placeholderTextColor={alpha.creme(0.35)}
        textAlign="center"
        maxLength={5}
        selectTextOnFocus
        accessibilityLabel="Bonus (saisie manuelle)"
      />

      <StepBtn label="+5" tone="pos" onPress={() => apply(5)} border="left" />
      <StepBtn label="+10" tone="pos" onPress={() => apply(10)} border="left" />
    </View>
  );
}

function StepBtn({
  label,
  tone,
  onPress,
  border,
}: {
  label: string;
  tone: 'pos' | 'neg';
  onPress: () => void;
  border: 'left' | 'right';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Bonus ${label}`}
      style={({ pressed }) => [
        styles.btn,
        border === 'right' ? styles.borderRight : styles.borderLeft,
        pressed && (tone === 'pos' ? styles.pressedPos : styles.pressedNeg),
      ]}
    >
      <Text
        style={[
          styles.btnText,
          tone === 'pos' ? styles.posText : styles.negText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: alpha.creme(0.24),
  },
  btn: {
    width: 54,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderRight: { borderRightWidth: 1, borderRightColor: alpha.creme(0.24) },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: alpha.creme(0.24) },
  pressedNeg: { backgroundColor: alpha.grenat(0.16) },
  pressedPos: { backgroundColor: alpha.paille(0.16) },
  btnText: { fontFamily: fonts.displayBlack, fontSize: 21, lineHeight: 21 },
  negText: { color: colors.grenat },
  posText: { color: colors.paille },
  input: {
    flex: 1,
    height: 62,
    fontFamily: fonts.displayBlack,
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
});
