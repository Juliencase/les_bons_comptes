// Écran de configuration Belote : 2 équipes fixes de 2 joueurs + score cible.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ChipPicker from '../components/ChipPicker';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import { getGame, playerRange } from '../lib/games';
import { finalizePlayerNames } from '../lib/names';
import { useStore } from '../lib/store';
import { BeloteTeam } from '../lib/belote/types';
import { alpha, colors, fonts } from '../theme';

const activeGame = getGame('belote');
const TEAM_LABELS = ['Nous', 'Eux'];

const TARGET_SCORES = [500, 1000, 1500, 2000];
const TARGET_SCORE_OPTIONS = TARGET_SCORES.map((s) => ({
  key: String(s),
  label: String(s),
}));
const DEFAULT_TARGET_SCORE = TARGET_SCORES[0];

export default function BeloteSetupScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const startBeloteGame = useStore((s) => s.startBeloteGame);

  const [teamAPlayers, setTeamAPlayers] = useState(['', '']);
  const [teamBPlayers, setTeamBPlayers] = useState(['', '']);
  const [targetScoreKey, setTargetScoreKey] = useState(
    String(DEFAULT_TARGET_SCORE),
  );

  const setPlayer = (team: 'A' | 'B', i: number, v: string) => {
    const setter = team === 'A' ? setTeamAPlayers : setTeamBPlayers;
    setter((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  };

  const start = () => {
    const [a1, a2] = finalizePlayerNames(teamAPlayers, 'Joueur A');
    const [b1, b2] = finalizePlayerNames(teamBPlayers, 'Joueur B');
    const teams: [BeloteTeam, BeloteTeam] = [
      { id: 'team-a', players: [a1, a2] },
      { id: 'team-b', players: [b1, b2] },
    ];
    startBeloteGame(teams, Number(targetScoreKey));
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <ScreenHeader
              left={
                <BackButton
                  label="Belote"
                  onPress={() => setScreen('belote-home')}
                />
              }
            />
            <Text style={styles.title}>Nouvelle partie</Text>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <SectionTitle index="01">Équipes</SectionTitle>
                  <Text style={styles.sectionMeta}>
                    {playerRange(activeGame)} joueurs · 2 contre 2
                  </Text>
                </View>
                <View style={styles.teams}>
                  <TeamCard
                    label={TEAM_LABELS[0]}
                    lead
                    players={teamAPlayers}
                    onChange={(i, v) => setPlayer('A', i, v)}
                  />
                  <TeamCard
                    label={TEAM_LABELS[1]}
                    players={teamBPlayers}
                    onChange={(i, v) => setPlayer('B', i, v)}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <SectionTitle index="02">Score cible</SectionTitle>
                <ChipPicker
                  variant="grid"
                  options={TARGET_SCORE_OPTIONS}
                  selectedKey={targetScoreKey}
                  onSelect={setTargetScoreKey}
                />
                <Text style={styles.hint}>
                  Pas de nombre de donnes fixé : la partie s&apos;arrête quand
                  une équipe atteint {targetScoreKey}. Contrat à 82, sans
                  coinche.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Button label="Première donne" onPress={start} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function TeamCard({
  label,
  lead,
  players,
  onChange,
}: {
  label: string;
  lead?: boolean;
  players: string[];
  onChange: (i: number, v: string) => void;
}) {
  return (
    <View style={[styles.teamCard, lead && styles.teamCardLead]}>
      <Text style={styles.teamName}>{label}</Text>
      <View style={styles.playerRows}>
        {players.map((name, i) => (
          <View key={i} style={styles.playerRow}>
            <TextInput
              style={styles.input}
              value={name}
              placeholder={`Joueur ${i + 1}`}
              placeholderTextColor={alpha.creme(0.35)}
              onChangeText={(t) => onChange(i, t)}
              maxLength={16}
              returnKeyType="done"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 46,
    lineHeight: Math.round(46 * 0.86),
    textTransform: 'uppercase',
    color: colors.creme,
    marginTop: 14,
  },
  body: { paddingVertical: 22, gap: 22 },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.45),
  },
  teams: { gap: 8 },
  teamCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    padding: 14,
    gap: 12,
  },
  teamCardLead: { borderLeftWidth: 4, borderLeftColor: colors.paille },
  teamName: {
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    lineHeight: 30,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  playerRows: { gap: 5 },
  playerRow: { borderWidth: 1, borderColor: alpha.creme(0.18) },
  input: {
    height: 50,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    textTransform: 'uppercase',
    color: colors.creme,
    paddingHorizontal: 12,
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 17,
    color: alpha.creme(0.45),
    marginTop: 10,
  },
  footer: { paddingVertical: 18 },
});
