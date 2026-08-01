// Écran de lancement « Les Bons Comptes » : choix du jeu à compter.
// Extensible : ajouter une entrée dans GAMES suffit pour proposer un nouveau jeu.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { Screen } from '../lib/types';
import { colors, radius, spacing } from '../theme';

type GameDef = {
  key: string;
  name: string;
  emoji: string;
  subtitle: string;
  available: boolean;
  screen?: Screen; // écran d'accueil du jeu (si disponible)
};

const GAMES: GameDef[] = [
  {
    key: 'skull-king',
    name: 'Skull King',
    emoji: '☠️',
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
          <Text style={styles.subtitle}>Le compteur qui ne se trompe jamais</Text>
        </View>

        <Text style={styles.sectionTitle}>Choisis un jeu</Text>

        <View style={styles.list}>
          {GAMES.map((g) => (
            <Pressable
              key={g.key}
              disabled={!g.available}
              onPress={() => g.screen && setScreen(g.screen)}
              style={({ pressed }) => [
                styles.card,
                !g.available && styles.cardDisabled,
                pressed && g.available && styles.pressed,
              ]}
            >
              <Text style={styles.cardEmoji}>{g.emoji}</Text>
              <View style={styles.cardBody}>
                <Text
                  style={[styles.cardName, !g.available && styles.cardNameDim]}
                >
                  {g.name}
                </Text>
                <Text style={styles.cardSubtitle}>{g.subtitle}</Text>
              </View>
              {g.available ? (
                gameInProgress && g.key === 'skull-king' ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>En cours</Text>
                  </View>
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )
              ) : (
                <View style={[styles.badge, styles.badgeSoon]}>
                  <Text style={styles.badgeSoonText}>Bientôt</Text>
                </View>
              )}
            </Pressable>
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
    fontSize: 15,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.7 },
  cardEmoji: { fontSize: 34 },
  cardBody: { flex: 1 },
  cardName: { color: colors.text, fontSize: 19, fontWeight: '800' },
  cardNameDim: { color: colors.textDim },
  cardSubtitle: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.gold, fontSize: 28, fontWeight: '700' },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
  },
  badgeText: { color: colors.bg, fontSize: 12, fontWeight: '800' },
  badgeSoon: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  badgeSoonText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
});
