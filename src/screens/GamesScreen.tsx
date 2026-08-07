// Écran de lancement « Les Bons Comptes » : choix du jeu à compter.
// Extensible : ajouter une entrée dans GAMES suffit pour proposer un nouveau jeu.
import React from 'react';
import { ImageSourcePropType, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import { useStore } from '../lib/store';
import { Screen } from '../lib/types';
import { colors, spacing } from '../theme';

type GameDef = {
  key: string;
  name: string;
  emoji: string;
  image?: ImageSourcePropType;
  subtitle: string;
  available: boolean;
  screen?: Screen; // écran d'accueil du jeu (si disponible)
};

const GAMES: GameDef[] = [
  {
    key: 'skull-king',
    name: 'Skull King',
    emoji: '☠️',
    image: require('../../assets/game/skull-king.png'),
    subtitle: '2 à 8 joueurs · 10 manches',
    available: true,
    screen: 'home',
  },
  {
    key: 'coming-soon',
    name: "D'autres jeux arrivent",
    emoji: '🎲',
    subtitle: 'Bientôt dans Les Bons Comptes',
    available: false,
  },
];

export default function GamesScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const game = useStore((s) => s.game);
  const gameInProgress = !!game && !game.finishedAt;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.brandEmoji}>🎲</Text>
          <Text style={styles.title}>Les Bons Comptes</Text>
          <Text style={styles.subtitle}>« Font les bonnes parties »</Text>
        </View>

        <Text style={styles.sectionTitle}>Choisis un jeu</Text>

        <View style={styles.list}>
          {GAMES.map((g) => (
            <GameCard
              key={g.key}
              emoji={g.emoji}
              image={g.image}
              name={g.name}
              subtitle={g.subtitle}
              available={g.available}
              badgeLabel={
                !g.available
                  ? 'Bientôt'
                  : gameInProgress && g.key === 'skull-king'
                    ? 'En cours'
                    : undefined
              }
              badgeSoon={!g.available}
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
  brandEmoji: { fontSize: 60 },
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
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.6,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.md },
});
