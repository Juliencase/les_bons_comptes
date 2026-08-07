// Encart mettant en avant le vainqueur d'une partie terminée.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  label: string;
  name: string;
  score: number;
};

export default function WinnerCard({ label, name, score }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.name}>🏴‍☠️ {name}</Text>
      <Text style={styles.score}>{score} points</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    color: colors.textDim,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: { color: colors.gold, fontSize: 26, fontWeight: '800' },
  score: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
