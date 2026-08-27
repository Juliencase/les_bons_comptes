// Pastille d'action d'en-tête (ex. « Scores ⌃ ») — agnostique, pilotée par
// props. Utilisée par les écrans de saisie (Skull King, Belote) pour accéder
// au tableau des scores sans quitter la manche en cours.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { alpha, colors, fonts } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
};

export default function HeaderPill({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      {({ pressed }) => (
        <Text
          style={[styles.text, pressed && styles.textPressed]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: alpha.creme(0.3),
  },
  pressed: { borderColor: colors.paille },
  text: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 10 * 0.14,
    textTransform: 'uppercase',
    color: alpha.creme(0.55),
  },
  textPressed: { color: colors.paille },
});
