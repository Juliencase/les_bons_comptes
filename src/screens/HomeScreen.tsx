// Écran d'accueil : nouvelle partie, reprendre, ou voir le dernier tableau.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { colors, radius, spacing } from '../theme';

export default function HomeScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const resumeGame = useStore((s) => s.resumeGame);

  const hasGame = !!game;
  const finished = !!game?.finishedAt;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.brandEmoji}>🎲</Text>
          <Text style={styles.title}>Les Bons Comptes</Text>
          <Text style={styles.subtitle}>Le compteur qui ne se trompe jamais</Text>
          <View style={styles.gameChip}>
            <Text style={styles.gameChipText}>☠️  Skull King</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => setScreen('setup')}
          >
            <Text style={styles.primaryText}>Nouvelle partie</Text>
          </Pressable>

          {hasGame && !finished && (
            <Pressable
              style={({ pressed }) => [
                styles.secondary,
                pressed && styles.pressed,
              ]}
              onPress={resumeGame}
            >
              <Text style={styles.secondaryText}>
                Reprendre — manche {game!.currentRound}/{game!.totalRounds}
              </Text>
            </Pressable>
          )}

          {hasGame && (
            <Pressable
              style={({ pressed }) => [
                styles.ghost,
                pressed && styles.pressed,
              ]}
              onPress={() => setScreen('scoreboard')}
            >
              <Text style={styles.ghostText}>
                {finished ? 'Voir le résultat final' : 'Voir le tableau des scores'}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.footer}>Système classique · 2 à 8 joueurs</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: spacing.xxl * 1.5 },
  brandEmoji: { fontSize: 64 },
  title: {
    color: colors.gold,
    fontSize: 34,
    fontWeight: '800',
    marginTop: spacing.md,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gameChip: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  gameChipText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  actions: { gap: spacing.md },
  primary: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: { color: colors.bg, fontSize: 18, fontWeight: '800' },
  secondary: {
    backgroundColor: colors.cardAlt,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  ghost: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ghostText: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  footer: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 13,
  },
});
