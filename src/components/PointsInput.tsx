// Saisie numérique bornée (ex. points bruts d'une manche de Belote, 0..162).
// `value` peut être `null` tant que rien n'a été saisi (champ vide, pas de 0 implicite).
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  value: number | null;
  min: number;
  max: number;
  onChange: (value: number | null) => void;
  label: string; // accessibilité
};

export default function PointsInput({ value, min, max, onChange, label }: Props) {
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
      placeholderTextColor={colors.textDim}
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
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgAlt,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
  },
});
