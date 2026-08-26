// Bouton icône seule (ex. ☰, 📊) — agnostique ; le label porte l'accessibilité.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, opacity } from '../theme';

type Tone = 'default' | 'danger';

type Props = {
  icon: string;
  label: string;
  onPress: () => void;
  tone?: Tone;
  /** Fond circulaire (ex. bouton de suppression dans une liste). */
  circle?: boolean;
};

export default function IconButton({
  icon,
  label,
  onPress,
  tone = 'default',
  circle,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        circle && styles.circle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.icon, tone === 'danger' && styles.iconDanger]}>
        {icon}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 22, color: colors.gold },
  iconDanger: { fontSize: 16, fontWeight: '700', color: colors.negative },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: opacity.pressedSubtle },
});
