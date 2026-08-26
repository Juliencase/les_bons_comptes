// Écran de saisie de la manche courante (Belote).
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import PointsInput from '../components/PointsInput';
import ScreenHeader from '../components/ScreenHeader';
import SegmentedToggle from '../components/SegmentedToggle';
import { useStore } from '../lib/store';
import {
  HAND_TOTAL_POINTS,
  cumulativeTeamTotals,
  isContractHeld,
  isHandComplete,
  otherTeam,
  teamName,
  teamRawPoints,
  winningTeamId,
} from '../lib/belote/scoring';
import { colors, goldTint, radius, spacing } from '../theme';
import { formatSignedScore } from '../lib/format';

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

  const takerName = teamName(
    beloteGame.teams.find((t) => t.id === entry.takerTeamId)!,
  );
  const defenderName = teamName(otherTeam(beloteGame.teams, entry.takerTeamId));
  const takerPoints = teamRawPoints(beloteGame.teams, entry, entry.takerTeamId);
  const contractHeld =
    entry.capotTeamId == null && isContractHeld(beloteGame.teams, entry);
  const complete = isHandComplete(entry);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          left={
            <IconButton
              icon="☰"
              label="Retour à l'accueil"
              onPress={() =>
                setScreen(editMode ? 'belote-scoreboard' : 'belote-home')
              }
            />
          }
          title={editMode ? `Modifier la manche ${hand}` : `Manche ${hand}`}
          subtitle={`Objectif : ${beloteGame.targetScore} pts`}
          right={
            <IconButton
              icon="📊"
              label="Voir le tableau des scores"
              onPress={() => setScreen('belote-scoreboard')}
            />
          }
          bordered
        />

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.totalsRow}>
            {beloteGame.teams.map((t) => (
              <View key={t.id} style={styles.totalCard}>
                <Text style={styles.totalName} numberOfLines={1}>
                  {teamName(t)}
                </Text>
                <Text style={styles.totalScore}>{totals[t.id]} pts</Text>
              </View>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Équipe preneuse</Text>
            <SegmentedToggle
              options={[
                { id: teamA.id, name: teamName(teamA) },
                { id: teamB.id, name: teamName(teamB) },
              ]}
              selectedId={entry.takerTeamId}
              onSelect={(id) => id && setHandTaker(hand, id)}
            />
          </View>

          {entry.capotTeamId == null && (
            <View style={styles.field}>
              <Text style={styles.label}>
                Points comptés (total {HAND_TOTAL_POINTS})
              </Text>
              <Text style={styles.pointsHelp}>
                Saisis le camp le plus simple à compter — l&apos;autre se déduit
                automatiquement. Nom en or = équipe preneuse.
              </Text>
              <View style={styles.pointsRow}>
                {beloteGame.teams.map((t, i) => {
                  const isTaker = t.id === entry.takerTeamId;
                  const name = teamName(t);
                  return (
                    <React.Fragment key={t.id}>
                      {i > 0 && <Text style={styles.pointsSeparator}>/</Text>}
                      <View style={styles.pointsCol}>
                        <Text
                          style={[
                            styles.pointsColLabel,
                            isTaker && styles.pointsColLabelTaker,
                          ]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        <PointsInput
                          value={teamRawPoints(beloteGame.teams, entry, t.id)}
                          min={0}
                          max={HAND_TOTAL_POINTS}
                          onChange={(v) => setHandTeamPoints(hand, t.id, v)}
                          label={`Points ${name}`}
                        />
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
              {takerPoints == null ? (
                <Text style={styles.pointsHelp}>
                  Saisis les points pour voir le résultat.
                </Text>
              ) : (
                <Text
                  style={[
                    styles.contractHint,
                    contractHeld
                      ? styles.contractHeldHint
                      : styles.contractFailedHint,
                  ]}
                >
                  {contractHeld
                    ? `✓ Contrat tenu : ${takerName} marque ${takerPoints} pts, ${defenderName} marque ${HAND_TOTAL_POINTS - takerPoints} pts.`
                    : `✗ Chute : ${defenderName} marque les ${HAND_TOTAL_POINTS} pts, ${takerName} marque 0.`}
                </Text>
              )}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Capot (toutes les levées)</Text>
            <SegmentedToggle
              options={[
                { id: teamA.id, name: teamName(teamA) },
                { id: teamB.id, name: teamName(teamB) },
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
                { id: teamA.id, name: teamName(teamA) },
                { id: teamB.id, name: teamName(teamB) },
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
              beloteGame.teams.map((t) => {
                const delta = previewTotals[t.id] - totals[t.id];
                return (
                  <View key={t.id} style={styles.previewRow}>
                    <Text style={styles.previewName}>{teamName(t)}</Text>
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
            <>
              {hand > 1 && (
                <Button
                  variant="ghost"
                  label="‹ Manche précédente"
                  onPress={() => goToBeloteHand(hand - 1)}
                />
              )}
              <Button
                label={
                  willFinish ? 'Terminer la partie' : 'Valider la manche ›'
                }
                onPress={commitBeloteHand}
                disabled={!complete}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.lg },
  totalsRow: { flexDirection: 'row', gap: spacing.md },
  totalCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  totalName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  totalScore: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  field: { gap: spacing.sm },
  label: {
    color: colors.textDim,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointsHelp: { color: colors.textDim, fontSize: 11, fontStyle: 'italic' },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pointsCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  pointsColLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  pointsColLabelTaker: { color: colors.gold },
  pointsSeparator: { color: colors.textDim, fontSize: 16, fontWeight: '700' },
  contractHint: { fontSize: 12, fontWeight: '600', marginTop: spacing.xs },
  contractHeldHint: { color: colors.positive },
  contractFailedHint: { color: colors.negative },
  preview: {
    backgroundColor: goldTint.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: goldTint.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  previewDelta: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    width: 48,
  },
  previewTotal: { color: colors.text, fontSize: 14, fontWeight: '700' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
});
