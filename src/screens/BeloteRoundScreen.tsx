// Écran de saisie de la manche courante (Belote).
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import HeaderPill from '../components/HeaderPill';
import ProgressBar from '../components/ProgressBar';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import SegmentedToggle from '../components/SegmentedToggle';
import { useStore } from '../lib/store';
import {
  HAND_TOTAL_POINTS,
  cumulativeTeamTotals,
  isContractHeld,
  isHandComplete,
  teamRawPoints,
  winningTeamId,
} from '../lib/belote/scoring';
import { alpha, colors, fonts } from '../theme';
import { formatSignedScore } from '../lib/format';

const TEAM_LABELS = ['Nous', 'Eux'];

export default function BeloteRoundScreen() {
  const beloteGame = useStore((s) => s.beloteGame);
  const setScreen = useStore((s) => s.setScreen);
  const setHandTaker = useStore((s) => s.setHandTaker);
  const setHandTeamPoints = useStore((s) => s.setHandTeamPoints);
  const setHandCapot = useStore((s) => s.setHandCapot);
  const setHandBeloteRebelote = useStore((s) => s.setHandBeloteRebelote);
  const commitBeloteHand = useStore((s) => s.commitBeloteHand);
  const goToBeloteHand = useStore((s) => s.goToBeloteHand);

  if (!beloteGame) return null;

  const hand = beloteGame.currentHand;
  const entry = beloteGame.hands[hand];
  if (!entry) return null;

  const [teamA, teamB] = beloteGame.teams;
  const totals = cumulativeTeamTotals(beloteGame);
  // Partie déjà terminée : on rouvre une manche passée pour corriger un score.
  const editMode = !!beloteGame.finishedAt;

  const previewGame = {
    ...beloteGame,
    hands: { ...beloteGame.hands, [hand]: { ...entry, validated: true } },
  };
  const previewTotals = cumulativeTeamTotals(previewGame);
  const willFinish = winningTeamId(previewGame) != null;

  const takerIndex = beloteGame.teams.findIndex(
    (t) => t.id === entry.takerTeamId,
  );
  const takerName = TEAM_LABELS[takerIndex];
  const defenderName = TEAM_LABELS[takerIndex === 0 ? 1 : 0];
  const takerPoints = teamRawPoints(beloteGame.teams, entry, entry.takerTeamId);
  const contractHeld =
    entry.capotTeamId == null && isContractHeld(beloteGame.teams, entry);
  const complete = isHandComplete(entry);

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
                  label={
                    editMode
                      ? 'Scores'
                      : hand > 1
                        ? `Donne ${String(hand - 1).padStart(2, '0')}`
                        : 'Accueil'
                  }
                  onPress={() =>
                    editMode
                      ? setScreen('belote-scoreboard')
                      : hand > 1
                        ? goToBeloteHand(hand - 1)
                        : setScreen('belote-home')
                  }
                />
              }
              right={
                <HeaderPill
                  label="Scores ⌃"
                  onPress={() => setScreen('belote-scoreboard')}
                />
              }
            />

            <ScrollView
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <Text style={styles.title}>
                  {editMode
                    ? `Modifier la donne ${hand}`
                    : `Donne ${String(hand).padStart(2, '0')}`}
                </Text>
                <Text style={styles.meta}>
                  Objectif {beloteGame.targetScore} pts · {HAND_TOTAL_POINTS} à
                  répartir
                </Text>
              </View>

              <View style={styles.totalsRow}>
                {beloteGame.teams.map((t, i) => (
                  <View key={t.id} style={styles.totalCard}>
                    <Text style={styles.totalName}>{TEAM_LABELS[i]}</Text>
                    <View style={styles.totalRight}>
                      <Text style={styles.totalScore}>{totals[t.id]}</Text>
                      <ProgressBar
                        progress={totals[t.id] / beloteGame.targetScore}
                        color={i === 0 ? colors.paille : alpha.creme(0.55)}
                        height={5}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Équipe preneuse</Text>
                <SegmentedToggle
                  options={[
                    { id: teamA.id, name: TEAM_LABELS[0] },
                    { id: teamB.id, name: TEAM_LABELS[1] },
                  ]}
                  selectedId={entry.takerTeamId}
                  onSelect={(id) => id && setHandTaker(hand, id)}
                />
              </View>

              {entry.capotTeamId == null && (
                <View style={styles.field}>
                  <View style={styles.pointsHead}>
                    <Text style={styles.label}>
                      Points comptés · {TEAM_LABELS[0]}
                    </Text>
                    <Text style={styles.pointsOther}>
                      {TEAM_LABELS[1]} :{' '}
                      {HAND_TOTAL_POINTS -
                        (teamRawPoints(beloteGame.teams, entry, teamA.id) ?? 0)}
                    </Text>
                  </View>
                  <PointsStepper
                    value={teamRawPoints(beloteGame.teams, entry, teamA.id)}
                    onChange={(v) => setHandTeamPoints(hand, teamA.id, v)}
                  />
                  {takerPoints == null ? (
                    <Text style={styles.pointsHelp}>
                      Saisis les points pour voir le résultat.
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.contractHint,
                        contractHeld
                          ? styles.contractHeld
                          : styles.contractFailed,
                      ]}
                    >
                      {contractHeld
                        ? `Contrat tenu : ${takerName} marque ${takerPoints} pts, ${defenderName} marque ${HAND_TOTAL_POINTS - takerPoints} pts.`
                        : `Chute : ${defenderName} marque les ${HAND_TOTAL_POINTS} pts, ${takerName} marque 0.`}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Capot (toutes les levées)</Text>
                <SegmentedToggle
                  options={[
                    { id: teamA.id, name: TEAM_LABELS[0] },
                    { id: teamB.id, name: TEAM_LABELS[1] },
                  ]}
                  selectedId={entry.capotTeamId}
                  onSelect={(id) => setHandCapot(hand, id)}
                  allowNone
                  noneLabel="Pas de capot"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Belote-Rebelote</Text>
                <SegmentedToggle
                  options={[
                    { id: teamA.id, name: TEAM_LABELS[0] },
                    { id: teamB.id, name: TEAM_LABELS[1] },
                  ]}
                  selectedId={entry.beloteRebeloteTeamId}
                  onSelect={(id) => setHandBeloteRebelote(hand, id)}
                  allowNone
                  noneLabel="Aucune"
                />
              </View>

              <View style={styles.preview}>
                <Text style={styles.previewTitle}>Après validation</Text>
                {complete ? (
                  beloteGame.teams.map((t, i) => {
                    const delta = previewTotals[t.id] - totals[t.id];
                    return (
                      <View key={t.id} style={styles.previewRow}>
                        <Text style={styles.previewName}>{TEAM_LABELS[i]}</Text>
                        <Text style={styles.previewDelta}>
                          {formatSignedScore(delta)}
                        </Text>
                        <Text style={styles.previewTotal}>
                          {previewTotals[t.id]} pts
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.pointsHelp}>
                    Saisis les points (ou un capot) pour voir l&apos;aperçu.
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              {editMode ? (
                <Button
                  label="Retour au tableau des scores"
                  onPress={() => setScreen('belote-scoreboard')}
                />
              ) : (
                <Button
                  label={
                    willFinish ? 'Terminer la partie' : 'Valider la donne ›'
                  }
                  onPress={commitBeloteHand}
                  disabled={!complete}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/** Points comptés d'une équipe (0..162) : paliers ±10/±1 + saisie manuelle. */
function PointsStepper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    const current = text === '' ? null : Number(text);
    if (current !== value) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(HAND_TOTAL_POINTS, Math.max(0, n));
  const apply = (delta: number) => onChange(clamp((value ?? 0) + delta));

  const onEdit = (t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    setText(cleaned);
    onChange(cleaned === '' ? null : clamp(parseInt(cleaned, 10)));
  };

  return (
    <View style={pointsStyles.frame}>
      <PointsBtn label="−10" onPress={() => apply(-10)} border="right" />
      <PointsBtn label="−1" onPress={() => apply(-1)} border="right" />
      <TextInput
        style={pointsStyles.input}
        value={text}
        onChangeText={onEdit}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor={alpha.creme(0.35)}
        textAlign="center"
        maxLength={3}
        selectTextOnFocus
        accessibilityLabel="Points comptés"
      />
      <PointsBtn label="+1" onPress={() => apply(1)} border="left" />
      <PointsBtn label="+10" onPress={() => apply(10)} border="left" />
    </View>
  );
}

function PointsBtn({
  label,
  onPress,
  border,
}: {
  label: string;
  onPress: () => void;
  border: 'left' | 'right';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Points ${label}`}
      style={({ pressed }) => [
        pointsStyles.btn,
        border === 'right' ? pointsStyles.borderRight : pointsStyles.borderLeft,
        pressed && pointsStyles.btnPressed,
      ]}
    >
      <Text style={pointsStyles.btnText}>{label}</Text>
    </Pressable>
  );
}

const pointsStyles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: alpha.creme(0.24),
  },
  btn: {
    width: 54,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderRight: { borderRightWidth: 1, borderRightColor: alpha.creme(0.24) },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: alpha.creme(0.24) },
  btnPressed: { backgroundColor: alpha.creme(0.08) },
  btnText: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 15,
    color: colors.creme,
  },
  input: {
    flex: 1,
    height: 62,
    fontFamily: fonts.displayBlack,
    fontSize: 42,
    color: colors.paille,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  list: { paddingVertical: 18, gap: 18 },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 44,
    lineHeight: Math.round(44 * 0.86),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.55),
    marginTop: 7,
  },
  totalsRow: { gap: 5 },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    padding: 12,
    gap: 12,
  },
  totalName: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    lineHeight: 24,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  totalRight: { flex: 1, maxWidth: 130, alignItems: 'flex-end', gap: 6 },
  totalScore: { fontFamily: fonts.mono, fontSize: 9, color: alpha.creme(0.45) },
  field: { gap: 8 },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
  },
  pointsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  pointsOther: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.4),
  },
  pointsHelp: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.45),
  },
  contractHint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  contractHeld: { color: colors.paille },
  contractFailed: { color: colors.grenat },
  preview: {
    borderLeftWidth: 4,
    borderLeftColor: colors.paille,
    backgroundColor: alpha.paille(0.08),
    padding: 13,
    gap: 6,
  },
  previewTitle: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
    marginBottom: 4,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewName: {
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 16,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  previewDelta: {
    fontFamily: fonts.displayBlack,
    fontSize: 16,
    color: colors.paille,
    width: 52,
  },
  previewTotal: {
    fontFamily: fonts.displayBlack,
    fontSize: 16,
    color: colors.creme,
  },
  footer: { paddingVertical: 18, gap: 8 },
});
