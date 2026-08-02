// Écran d'accueil Skull King : nouvelle partie, reprendre, ou voir le dernier tableau.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { useStore } from '../lib/store';
import { colors, spacing } from '../theme';

export default function HomeScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const resumeGame = useStore((s) => s.resumeGame);

  const hasGame = !!game;
  const finished = !!game?.finishedAt;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader left={<BackButton label="Jeux" onPress={() => setScreen('games')} />} />

      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.gameEmoji}>☠️</Text>
          <Text style={styles.title}>Skull King</Text>
          <Text style={styles.subtitle}>Compteur de points</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Nouvelle partie" onPress={() => setScreen('setup')} />

          {hasGame && !finished && (
            <Button
              variant="secondary"
              label={`Reprendre — manche ${game!.currentRound}/${game!.totalRounds}`}
              onPress={resumeGame}
            />
          )}

          {hasGame && (
            <Button
              variant="ghost"
              label={finished ? 'Voir le résultat final' : 'Voir le tableau des scores'}
              onPress={() => setScreen('scoreboard')}
            />
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
  hero: { alignItems: 'center', marginTop: spacing.xxl },
  gameEmoji: { fontSize: 72 },
  title: {
    color: colors.gold,
    fontSize: 40,
    fontWeight: '800',
    marginTop: spacing.md,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actions: { gap: spacing.md },
  footer: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 13,
  },
});
