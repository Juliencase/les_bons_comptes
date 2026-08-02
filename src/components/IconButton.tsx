// Bouton icône seule (ex. ☰, 📊) — agnostique ; le label porte l'accessibilité.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, opacity } from '../theme';

type Props = {
  icon: string;
  label: string;
  onPress: () => void;
};

export default function IconButton({ icon, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 22, color: colors.gold },
  pressed: { opacity: opacity.pressedSubtle },
});
