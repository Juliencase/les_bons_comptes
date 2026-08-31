// Écran d'accueil Belote : nouvelle partie, reprendre, ou voir le dernier tableau.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GameHomeScreen from '../components/GameHomeScreen';
import ProgressBar from '../components/ProgressBar';
import Sheet from '../components/Sheet';
import { getGame, playerRange } from '../lib/games';
import { cumulativeTeamTotals } from '../lib/belote/scoring';
import { useStore } from '../lib/store';
import { alpha, colors, fonts } from '../theme';

const activeGame = getGame('belote');
const TEAM_LABELS = ['Nous', 'Eux'];

export default function BeloteHomeScreen() {
  const [confirmReplace, setConfirmReplace] = useState(false);
  const beloteGame = useStore((s) => s.beloteGame);
  const setScreen = useStore((s) => s.setScreen);
  const resumeBeloteGame = useStore((s) => s.resumeBeloteGame);

  const hasGame = !!beloteGame;
  const finished = !!beloteGame?.finishedAt;
  const inProgress = hasGame && !finished;
  const totals = beloteGame ? cumulativeTeamTotals(beloteGame) : null;

  return (
    <>
      <GameHomeScreen
        title="Belote"
        meta={`${playerRange(activeGame)} joueurs · ~${activeGame.duration} min · contrat à 82, sans coinche`}
        statusMeta={
          inProgress
            ? `Manche ${beloteGame!.currentHand} · objectif ${beloteGame!.targetScore} pts`
            : undefined
        }
        statusContent={
          inProgress && totals ? (
            <View style={styles.teams}>
              {beloteGame!.teams.map((t, i) => (
                <View key={t.id} style={styles.teamRow}>
                  <Text style={styles.teamName}>{TEAM_LABELS[i]}</Text>
                  <View style={styles.teamScoreCol}>
                    <Text style={styles.teamScore}>{totals[t.id]}</Text>
                    <ProgressBar
                      progress={totals[t.id] / beloteGame!.targetScore}
                      color={i === 0 ? colors.paille : alpha.creme(0.55)}
                      height={5}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : undefined
        }
        footer={`Belote classique · contrat à 82 · ${playerRange(activeGame)} joueurs`}
        onBack={() => setScreen('games')}
        onNewGame={() =>
          inProgress ? setConfirmReplace(true) : setScreen('belote-setup')
        }
        resumeLabel={
          inProgress
            ? `Reprendre — manche ${beloteGame!.currentHand}`
            : undefined
        }
        onResume={inProgress ? resumeBeloteGame : undefined}
        showScoreboard={hasGame}
        scoreboardLabel={
          finished ? 'Voir le résultat final' : 'Voir le tableau des scores'
        }
        onScoreboard={() => setScreen('belote-scoreboard')}
      />
      <Sheet
        visible={confirmReplace}
        kicker="Attention"
        title={'Une partie est\nen cours'}
        message={`Manche ${beloteGame?.currentHand}, objectif ${beloteGame?.targetScore} pts. En démarrer une nouvelle l'efface définitivement — il n'y a pas d'historique.`}
        confirmLabel="Remplacer la partie"
        onConfirm={() => {
          setConfirmReplace(false);
          setScreen('belote-setup');
        }}
        onCancel={() => setConfirmReplace(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  teams: { gap: 14 },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  teamName: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    lineHeight: 24,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  teamScoreCol: { flex: 1, maxWidth: 140, gap: 6, alignItems: 'flex-end' },
  teamScore: {
    fontFamily: fonts.displayBlack,
    fontSize: 22,
    lineHeight: 22,
    color: colors.creme,
    fontVariant: ['tabular-nums'],
  },
});
