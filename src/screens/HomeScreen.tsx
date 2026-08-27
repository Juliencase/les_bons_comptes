// Écran d'accueil Skull King : nouvelle partie, reprendre, ou voir le dernier tableau.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GameHomeScreen from '../components/GameHomeScreen';
import SegmentBar, { SegmentState } from '../components/SegmentBar';
import Sheet from '../components/Sheet';
import { getGame, playerRange } from '../lib/games';
import { joinNames } from '../lib/names';
import { ranking } from '../lib/scoring';
import { getScoreSystem } from '../lib/scoreSystems';
import { useStore } from '../lib/store';
import { alpha, colors, fonts } from '../theme';

// Seul Skull King est implémenté pour l'instant — cf. CLAUDE.md.
const activeGame = getGame('skull-king');

export default function HomeScreen() {
  const [confirmReplace, setConfirmReplace] = useState(false);
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const resumeGame = useStore((s) => s.resumeGame);

  const hasGame = !!game;
  const finished = !!game?.finishedAt;
  const inProgress = hasGame && !finished;
  const totalRounds = game?.cardsPerRound.length ?? 0;

  // Aucun leader tant que personne n'a de score (tout le monde à 0 : pas de tête de partie).
  const leader =
    inProgress &&
    (() => {
      const rows = ranking(game!);
      const first = rows.filter((r) => r.rank === 1);
      if (first.every((r) => r.total === 0)) return null;
      return joinNames(
        first.map((r) => game!.players.find((p) => p.id === r.playerId)!.name),
      );
    })();

  const segments: SegmentState[] = Array.from(
    { length: totalRounds },
    (_, i) => {
      if (!game) return 'upcoming';
      const roundIndex = i + 1;
      if (roundIndex < game.currentRound) return 'done';
      return roundIndex === game.currentRound ? 'current' : 'upcoming';
    },
  );

  return (
    <>
      <GameHomeScreen
        title="Skull King"
        meta={`${playerRange(activeGame)} joueurs · ~${activeGame.duration} min · jeu de plis avec paris`}
        statusMeta={
          inProgress
            ? `${game!.players.length} joueurs · ${getScoreSystem(game!.scoreSystem).name}`
            : undefined
        }
        statusContent={
          inProgress ? (
            <View>
              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.statusLabel}>En tête</Text>
                  <Text style={styles.leaderName} numberOfLines={1}>
                    {leader ?? '—'}
                  </Text>
                </View>
                <View style={styles.statusRight}>
                  <Text style={styles.statusLabel}>Manche</Text>
                  <Text style={styles.roundValue}>
                    {String(game!.currentRound).padStart(2, '0')}
                    <Text style={styles.roundTotal}>/{totalRounds}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.segments}>
                <SegmentBar segments={segments} height={5} />
              </View>
            </View>
          ) : undefined
        }
        footer={
          inProgress
            ? `Système ${getScoreSystem(game!.scoreSystem).name} · ${playerRange(activeGame)} joueurs`
            : `Classique ou Rascal · ${playerRange(activeGame)} joueurs`
        }
        onBack={() => setScreen('games')}
        onNewGame={() =>
          inProgress ? setConfirmReplace(true) : setScreen('setup')
        }
        resumeLabel={
          inProgress
            ? `Reprendre — manche ${game!.currentRound}/${totalRounds}`
            : undefined
        }
        onResume={inProgress ? resumeGame : undefined}
        showScoreboard={hasGame}
        scoreboardLabel={
          finished ? 'Voir le résultat final' : 'Voir le tableau des scores'
        }
        onScoreboard={() => setScreen('scoreboard')}
      />
      <Sheet
        visible={confirmReplace}
        kicker="Attention"
        title={'Une partie est\nen cours'}
        message={`Manche ${game?.currentRound} sur ${totalRounds}, ${game?.players.length} joueurs. En démarrer une nouvelle l'efface définitivement — il n'y a pas d'historique.`}
        confirmLabel="Remplacer la partie"
        onConfirm={() => {
          setConfirmReplace(false);
          setScreen('setup');
        }}
        onCancel={() => setConfirmReplace(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
  },
  statusRight: { alignItems: 'flex-end' },
  statusLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.16,
    textTransform: 'uppercase',
    color: alpha.creme(0.45),
    marginBottom: 6,
  },
  leaderName: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
    lineHeight: Math.round(34 * 0.9),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  roundValue: {
    fontFamily: fonts.displayBlack,
    fontSize: 40,
    lineHeight: 40,
    color: colors.paille,
    fontVariant: ['tabular-nums'],
  },
  roundTotal: { color: alpha.creme(0.4) },
  segments: { marginTop: 16 },
});
