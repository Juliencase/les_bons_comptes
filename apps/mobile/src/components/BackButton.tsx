// Lien de retour texte (« ← Libellé ») — agnostique, piloté par props.
// Mono uppercase, cible tactile 44 px min (charte §05).
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { alpha, fonts } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
};

export default function BackButton({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Retour — ${label}`}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Text style={styles.text} numberOfLines={1}>
        ← {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 44, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  text: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 10 * 0.16,
    textTransform: 'uppercase',
    color: alpha.creme(0.55),
  },
});
