// Encart mettant en avant le vainqueur d'une partie terminée.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../theme';

type Props = {
  label: string;
  name: string;
  score: number;
};

export default function WinnerCard({ label, name, score }: Props) {
  return (
    <View style={styles.glow}>
      <LinearGradient colors={[colors.card, '#183742']} style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.name}>🏴‍☠️ {name}</Text>
        <Text style={styles.score}>{score} points</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: radius.lg + 4,
    shadowColor: colors.gold,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  card: {
    borderRadius: radius.lg + 4,
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
  // Plusieurs vainqueurs ex æquo tiennent sur plusieurs lignes : on centre.
  name: { color: colors.gold, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  score: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
