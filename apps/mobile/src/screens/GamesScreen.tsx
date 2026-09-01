// Écran de lancement « Les Bons Comptes » : choix du jeu à compter.
// Le catalogue des jeux vit dans src/lib/games.ts.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameCard from '../components/GameCard';
import ScreenBackground from '../components/ScreenBackground';
import { GAMES } from '../lib/games';
import { useStore } from '../lib/store';
import { alpha, colors, contentMaxWidth, fonts } from '../theme';

export default function GamesScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const game = useStore((s) => s.game);
  const beloteGame = useStore((s) => s.beloteGame);
  const inProgress = new Map(
    [
      game && !game.finishedAt
        ? ([game.gameKey, game.currentRound] as const)
        : null,
      beloteGame && !beloteGame.finishedAt
        ? ([beloteGame.gameKey, beloteGame.currentHand] as const)
        : null,
    ].filter((e): e is readonly [string, number] => e != null),
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.title}>
              Les bons{'\n'}
              <Text style={styles.titleAccent}>comptes</Text>
            </Text>
            <Text style={styles.subtitle}>
              Posez l&apos;appareil au centre de la table. Il tient les comptes,
              vous jouez.
            </Text>
          </View>

          <View style={styles.list}>
            {GAMES.map((g) => (
              <GameCard
                key={g.key}
                name={g.name}
                tagline={g.tagline}
                minPlayers={g.minPlayers}
                maxPlayers={g.maxPlayers}
                durationMin={g.duration}
                available={g.available}
                badgeLabel={
                  inProgress.has(g.key)
                    ? `En cours · manche ${String(inProgress.get(g.key)).padStart(2, '0')}`
                    : undefined
                }
                onPress={() => g.screen && setScreen(g.screen)}
              />
            ))}
          </View>

          <Pressable
            onPress={() => setScreen('room')}
            accessibilityRole="button"
            accessibilityLabel="Multijoueur — créer ou rejoindre une salle à distance"
            style={({ pressed }) => [
              styles.multiplayer,
              pressed && styles.multiplayerPressed,
            ]}
          >
            <View>
              <Text style={styles.multiplayerName}>Multijoueur</Text>
              <Text style={styles.multiplayerMeta}>
                Créer ou rejoindre une salle à distance
              </Text>
            </View>
            <Text style={styles.multiplayerArrow}>→</Text>
          </Pressable>

          {inProgress.size === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucune partie en cours</Text>
              <Text style={styles.emptyText}>
                Choisissez un jeu pour commencer. Tout reste sur cet appareil :
                ni compte, ni connexion, ni historique au-delà de la dernière
                partie.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: 22,
    paddingTop: 26,
    paddingBottom: 26,
    gap: 22,
    maxWidth: contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { gap: 12 },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 58,
    lineHeight: Math.round(58 * 0.82),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  titleAccent: { color: colors.sanguine },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 18,
    color: alpha.creme(0.55),
    maxWidth: 320,
  },
  list: { gap: 8 },
  multiplayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    padding: 16,
  },
  multiplayerPressed: { borderColor: colors.sanguine },
  multiplayerName: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: Math.round(26 * 0.9),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  multiplayerMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.55),
    marginTop: 6,
  },
  multiplayerArrow: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: 26,
    color: alpha.creme(0.4),
  },
  emptyState: {
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.16),
    paddingTop: 16,
  },
  emptyTitle: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: Math.round(22 * 1.1),
    letterSpacing: 22 * 0.03,
    textTransform: 'uppercase',
    color: colors.creme,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 17,
    color: alpha.creme(0.5),
  },
});
