// Bouton de retour texte (« ‹ Libellé ») — agnostique, piloté par props.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, opacity } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
};

export default function BackButton({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Retour — ${label}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.text} numberOfLines={1}>
        ‹ {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.gold, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: opacity.pressed },
});
