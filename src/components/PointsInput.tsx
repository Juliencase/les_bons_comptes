// Saisie numérique bornée (ex. points bruts d'une manche de Belote, 0..162).
// `value` peut être `null` tant que rien n'a été saisi (champ vide, pas de 0 implicite).
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { alpha, colors, fonts } from '../theme';

type Props = {
  value: number | null;
  min: number;
  max: number;
  onChange: (value: number | null) => void;
  label: string; // accessibilité
};

export default function PointsInput({
  value,
  min,
  max,
  onChange,
  label,
}: Props) {
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    const currentNum = text === '' ? null : Number(text);
    if (currentNum !== value) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setText(cleaned);
    if (cleaned === '') {
      onChange(null);
      return;
    }
    const n = Math.min(max, Math.max(min, parseInt(cleaned, 10)));
    onChange(n);
  };

  return (
    <TextInput
      style={styles.input}
      value={text}
      onChangeText={commit}
      keyboardType="number-pad"
      placeholder="—"
      placeholderTextColor={alpha.creme(0.35)}
      textAlign="center"
      maxLength={3}
      selectTextOnFocus
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: 72,
    height: 48,
    borderWidth: 1,
    borderColor: alpha.creme(0.28),
    color: colors.creme,
    fontFamily: fonts.displayBlack,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 8,
  },
});
