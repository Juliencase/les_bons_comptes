// Écran de configuration Belote : 2 équipes de 2 joueurs + score cible.
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
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import { confirmOverwriteGame } from '../lib/confirm';
import { getGame, playerRange } from '../lib/games';
import { finalizePlayerNames } from '../lib/names';
import { useStore } from '../lib/store';
import { BeloteTeam } from '../lib/belote/types';
import { colors, radius, spacing } from '../theme';

const activeGame = getGame('belote');

const TARGET_SCORES = [500, 1000, 1500, 2000];
const TARGET_SCORE_OPTIONS = TARGET_SCORES.map((s) => ({
  key: String(s),
  label: `${s} pts`,
}));
const DEFAULT_TARGET_SCORE = TARGET_SCORES[0];

export default function BeloteSetupScreen() {
  const beloteGame = useStore((s) => s.beloteGame);
  const setScreen = useStore((s) => s.setScreen);
  const startBeloteGame = useStore((s) => s.startBeloteGame);
  const hasUnfinishedGame = !!beloteGame && !beloteGame.finishedAt;

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
    const targetScore = Number(targetScoreKey);
    if (hasUnfinishedGame) {
      confirmOverwriteGame(() => startBeloteGame(teams, targetScore));
      return;
    }
    startBeloteGame(teams, targetScore);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          left={
            <BackButton
              label="Retour"
              onPress={() => setScreen('belote-home')}
            />
          }
          title="Les équipes"
          subtitle={`${playerRange(activeGame)} joueurs en 2 équipes`}
        />

        <View style={styles.section}>
          <SectionTitle>Score cible</SectionTitle>
          <ChipPicker
            options={TARGET_SCORE_OPTIONS}
            selectedKey={targetScoreKey}
            onSelect={setTargetScoreKey}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          <TeamFields
            label="Équipe A"
            players={teamAPlayers}
            onChange={(i, v) => setPlayer('A', i, v)}
          />
          <TeamFields
            label="Équipe B"
            players={teamBPlayers}
            onChange={(i, v) => setPlayer('B', i, v)}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.hint}>Partie en {targetScoreKey} points</Text>
          <Button label="Commencer la partie" onPress={start} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TeamFields({
  label,
  players,
  onChange,
}: {
  label: string;
  players: string[];
  onChange: (i: number, v: string) => void;
}) {
  return (
    <View style={styles.team}>
      <Text style={styles.teamLabel}>{label}</Text>
      {players.map((name, i) => (
        <TextInput
          key={i}
          style={styles.input}
          value={name}
          placeholder={`${label} · Joueur ${i + 1}`}
          placeholderTextColor={colors.textDim}
          onChangeText={(t) => onChange(i, t)}
          maxLength={16}
          returnKeyType="done"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.lg },
  team: { gap: spacing.sm },
  teamLabel: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  hint: { color: colors.textDim, textAlign: 'center', fontSize: 13 },
});
