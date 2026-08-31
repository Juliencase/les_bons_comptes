// Écran tableau des scores + classement / vainqueur.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AwardList from '../components/AwardList';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import RankingList from '../components/RankingList';
import ScoreTable from '../components/ScoreTable';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import WinnerCard from '../components/WinnerCard';
import { useStore } from '../lib/store';
import { rankingRows } from '../lib/scoring';
import { joinNames } from '../lib/names';
import { getScoreSystem } from '../lib/scoreSystems';
import { awards, playerStats, unawardedTitles } from '../lib/stats';
import { alpha, fonts } from '../theme';

/** Accord au pluriel (0 et 1 restent au singulier en français). */
const pli = (n: number) => `${n} pli${n > 1 ? 's' : ''}`;

export default function ScoreboardScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const goToRound = useStore((s) => s.goToRound);

  if (!game) return null;

  const finished = !!game.finishedAt;
  const systemLabel = `${getScoreSystem(game.scoreSystem).name}${
    game.cannonballRule ? ' · boulet de canon' : ''
  }`;
  const rows = rankingRows(game);
  const stats = Object.fromEntries(
    playerStats(game).map((s) => [s.playerId, s]),
  );
  const nameOf = (id: string) =>
    game.players.find((p) => p.id === id)?.name ?? '?';
  // Plusieurs joueurs peuvent finir premiers ex æquo : ils se partagent l'encart
  // de victoire, on n'en désigne pas un au hasard.
  const winners = rows.filter((row) => row.rank === 1);
  const runnerUp = rows.find((row) => row.rank === 2);
  // Le palmarès n'a de sens qu'une fois la partie jouée jusqu'au bout ; il peut
  // rester vide (personne ne se distingue) et on n'affiche alors rien.
  const palmares = finished ? awards(game) : [];
  const unawarded = finished ? unawardedTitles(game) : [];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <ScreenHeader
            left={
              <BackButton label="Accueil" onPress={() => setScreen('home')} />
            }
          />

          <ScrollView contentContainerStyle={styles.body}>
            {finished ? (
              <>
                <Text style={styles.meta}>
                  Partie terminée · {game.cardsPerRound.length} manches ·{' '}
                  {systemLabel}
                </Text>
                {winners.length > 0 && (
                  <WinnerCard
                    label={winners.length > 1 ? 'Vainqueurs' : 'Vainqueur'}
                    name={joinNames(winners.map((w) => w.name))}
                    score={winners[0].total}
                    detail={
                      runnerUp != null
                        ? `+${winners[0].total - runnerUp.total} sur ${runnerUp.name} · ${pli(
                            stats[winners[0].id]?.tricks ?? 0,
                          )} remporté${(stats[winners[0].id]?.tricks ?? 0) > 1 ? 's' : ''}`
                        : undefined
                    }
                  />
                )}
              </>
            ) : (
              <Text style={styles.meta}>{systemLabel}</Text>
            )}

            <View>
              <SectionTitle>Classement</SectionTitle>
              <RankingList
                rows={rows.map((row) => ({
                  ...row,
                  meta: pli(stats[row.id]?.tricks ?? 0),
                }))}
              />
            </View>

            {palmares.length > 0 && (
              <View>
                <SectionTitle>Palmarès</SectionTitle>
                <AwardList
                  rows={palmares.map((award) => ({
                    id: award.key,
                    title: award.title,
                    tone: award.tone,
                    names: joinNames(award.playerIds.map(nameOf)),
                    detail: award.detail,
                  }))}
                />
                {unawarded.length > 0 && (
                  <Text style={styles.unawarded}>
                    {joinNames(unawarded.map((t) => t.title))} n&apos;
                    {unawarded.length > 1 ? 'ont' : 'a'} pas été décerné
                    {unawarded.length > 1 ? 's' : ''} : personne ne s&apos;est
                    détaché.
                  </Text>
                )}
              </View>
            )}

            <View>
              <View style={styles.detailHead}>
                <SectionTitle>Détail des manches</SectionTitle>
                {finished && (
                  <Text style={styles.editHint}>tap pour corriger</Text>
                )}
              </View>
              <ScoreTable
                game={game}
                onRoundPress={finished ? goToRound : undefined}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {finished ? (
              <Button label="On remet ça" onPress={() => setScreen('setup')} />
            ) : (
              <Button
                variant="secondary"
                label={`Reprendre la saisie (manche ${game.currentRound})`}
                onPress={() => goToRound(game.currentRound)}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 22 },
  body: { gap: 22, paddingBottom: 22 },
  meta: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 10 * 0.16,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
  },
  detailHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  editHint: { fontFamily: fonts.mono, fontSize: 9, color: alpha.creme(0.42) },
  unawarded: {
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 15,
    color: alpha.creme(0.42),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: alpha.creme(0.18),
    padding: 11,
    marginTop: 5,
  },
  footer: { paddingVertical: 18 },
});
