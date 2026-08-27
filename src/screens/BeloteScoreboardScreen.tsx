// Écran tableau des scores + vainqueur (Belote).
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import BeloteHandTable from '../components/BeloteHandTable';
import Button from '../components/Button';
import Callout from '../components/Callout';
import ProgressBar from '../components/ProgressBar';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import WinnerCard from '../components/WinnerCard';
import { useStore } from '../lib/store';
import {
  cumulativeTeamTotals,
  pointsToTarget,
  teamName,
} from '../lib/belote/scoring';
import { alpha, colors, fonts } from '../theme';

const TEAM_LABELS = ['Nous', 'Eux'];
// Le plus qu'une équipe peut marquer en une donne : capot (250) + Belote-Rebelote (20).
const MAX_HAND_SWING = 270;

export default function BeloteScoreboardScreen() {
  const beloteGame = useStore((s) => s.beloteGame);
  const setScreen = useStore((s) => s.setScreen);
  const goToBeloteHand = useStore((s) => s.goToBeloteHand);

  if (!beloteGame) return null;

  const finished = !!beloteGame.finishedAt;
  const totals = cumulativeTeamTotals(beloteGame);
  const leadingTeam = [...beloteGame.teams].sort(
    (a, b) => totals[b.id] - totals[a.id],
  )[0];
  const remaining = pointsToTarget(beloteGame, leadingTeam.id);
  const leadingLabel = TEAM_LABELS[beloteGame.teams.indexOf(leadingTeam)];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <ScreenHeader
            left={
              <BackButton
                label="Accueil"
                onPress={() => setScreen('belote-home')}
              />
            }
            right={
              !finished ? (
                <Text style={styles.meta}>
                  Belote · objectif {beloteGame.targetScore}
                </Text>
              ) : undefined
            }
          />

          <ScrollView contentContainerStyle={styles.body}>
            {finished && (
              <WinnerCard
                label="Vainqueurs"
                name={teamName(leadingTeam)}
                score={totals[leadingTeam.id]}
              />
            )}

            <View style={styles.teams}>
              {beloteGame.teams.map((t, i) => (
                <View
                  key={t.id}
                  style={[styles.teamCard, i === 0 && styles.teamCardLead]}
                >
                  <View style={styles.teamHead}>
                    <View>
                      <Text style={styles.teamName}>{TEAM_LABELS[i]}</Text>
                      <Text style={styles.teamPlayers}>{teamName(t)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.teamScore,
                        i === 0 && styles.teamScoreLead,
                      ]}
                    >
                      {totals[t.id]}
                    </Text>
                  </View>
                  <View style={styles.teamProgress}>
                    <ProgressBar
                      progress={totals[t.id] / beloteGame.targetScore}
                      color={i === 0 ? colors.paille : alpha.creme(0.55)}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View>
              <View style={styles.detailHead}>
                <SectionTitle>Donnes</SectionTitle>
                {finished && (
                  <Text style={styles.editHint}>tap pour corriger</Text>
                )}
              </View>
              <BeloteHandTable
                game={beloteGame}
                onHandPress={finished ? goToBeloteHand : undefined}
              />
            </View>

            {!finished && (
              <Callout>
                {`${leadingLabel} · ${remaining} pts avant l'objectif.${
                  remaining > 0 && remaining <= MAX_HAND_SWING
                    ? ' Une donne peut suffire.'
                    : ''
                }`}
              </Callout>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {finished ? (
              <Button
                label="On remet ça"
                onPress={() => setScreen('belote-setup')}
              />
            ) : (
              <Button
                variant="secondary"
                label={`Reprendre la donne ${beloteGame.currentHand}`}
                onPress={() => goToBeloteHand(beloteGame.currentHand)}
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
  body: { gap: 20, paddingBottom: 22 },
  meta: { fontFamily: fonts.mono, fontSize: 10, color: alpha.creme(0.45) },
  teams: { gap: 8 },
  teamCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    padding: 16,
  },
  teamCardLead: { borderLeftWidth: 4, borderLeftColor: colors.paille },
  teamHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  teamName: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
    lineHeight: 34,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  teamPlayers: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: alpha.creme(0.5),
    marginTop: 5,
  },
  teamScore: {
    fontFamily: fonts.displayBlack,
    fontSize: 46,
    lineHeight: 46,
    color: colors.creme,
    fontVariant: ['tabular-nums'],
  },
  teamScoreLead: { color: colors.paille },
  teamProgress: { marginTop: 14 },
  detailHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  editHint: { fontFamily: fonts.mono, fontSize: 9, color: alpha.creme(0.42) },
  footer: { paddingVertical: 18 },
});
