// Écran de lancement « Les Bons Comptes » : choix du jeu à compter.
// Le catalogue des jeux vit dans src/lib/games.ts.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import GameCard from '../components/GameCard';
import { GAMES } from '../lib/games';
import { useStore } from '../lib/store';
import { colors, fonts, spacing } from '../theme';

export default function GamesScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const game = useStore((s) => s.game);
  const gameInProgress = !!game && !game.finishedAt;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.bgAlt, colors.bg]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>LES BONS COMPTES</Text>
          <Text style={styles.subtitle}>« Font les bonnes parties »</Text>
        </View>

        <Text style={styles.sectionTitle}>Choisis un jeu</Text>

        <View style={styles.grid}>
          {GAMES.map((g) => (
            <GameCard
              key={g.key}
              emoji={g.emoji}
              image={g.image}
              name={g.name}
              minPlayers={g.minPlayers}
              maxPlayers={g.maxPlayers}
              available={g.available}
              badgeLabel={gameInProgress && game!.gameKey === g.key ? 'En cours' : undefined}
              onPress={() => g.screen && setScreen(g.screen)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl },
  title: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.65,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
