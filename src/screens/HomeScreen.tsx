// Écran d'accueil Skull King : nouvelle partie, reprendre, ou voir le dernier tableau.
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { useStore } from '../lib/store';
import { colors, fonts, spacing } from '../theme';

// Dimensions du logo Skull King (assets/game/skull_king.png) : 1567x1186 px.
// On force des dimensions numériques (pas de %/aspectRatio) car <Image>
// retombe sur sa taille intrinsèque si le style ne lui donne pas des
// width/height résolus en pixels.
const LOGO_RATIO = 1186 / 1567;
const IMAGE_WIDTH = Math.min(Dimensions.get('window').width - spacing.xl * 2, 260);
const IMAGE_HEIGHT = Math.round(IMAGE_WIDTH * LOGO_RATIO);

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
          <Image
            source={require('../../assets/game/skull_king.png')}
            style={styles.gameImage}
            resizeMode="contain"
          />
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
  gameImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    maxWidth: IMAGE_WIDTH,
    maxHeight: IMAGE_HEIGHT,
  },
  title: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 30,
    marginTop: spacing.lg,
    letterSpacing: 0.5,
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
