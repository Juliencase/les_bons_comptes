// Écran tableau des scores + vainqueur (Belote).
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import BeloteHandTable from '../components/BeloteHandTable';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import WinnerCard from '../components/WinnerCard';
import { useStore } from '../lib/store';
import { cumulativeTeamTotals, teamName } from '../lib/belote/scoring';
import { colors, radius, spacing } from '../theme';

export default function BeloteScoreboardScreen() {
  const beloteGame = useStore((s) => s.beloteGame);
  const setScreen = useStore((s) => s.setScreen);
  const goToBeloteHand = useStore((s) => s.goToBeloteHand);

  if (!beloteGame) return null;

  const finished = !!beloteGame.finishedAt;
  const totals = cumulativeTeamTotals(beloteGame);
  const sortedTeams = [...beloteGame.teams].sort(
    (a, b) => totals[b.id] - totals[a.id],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        left={
          <BackButton
            label={finished ? 'Accueil' : 'Retour'}
            onPress={() =>
              finished
                ? setScreen('belote-home')
                : goToBeloteHand(beloteGame.currentHand)
            }
          />
        }
        title={finished ? 'Résultat final' : 'Scores'}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {finished && (
          <WinnerCard
            label="Vainqueurs"
            name={teamName(sortedTeams[0])}
            score={totals[sortedTeams[0].id]}
          />
        )}

        <View style={styles.totalsRow}>
          {sortedTeams.map((t) => (
            <View key={t.id} style={styles.totalCard}>
              <Text style={styles.totalName} numberOfLines={1}>
                {teamName(t)}
              </Text>
              <Text style={styles.totalScore}>{totals[t.id]} pts</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Détail des manches</Text>
        {finished && (
          <Text style={styles.editHint}>
            Touche une manche pour corriger un score.
          </Text>
        )}
        <BeloteHandTable
          game={beloteGame}
          onHandPress={finished ? goToBeloteHand : undefined}
        />
      </ScrollView>

      <View style={styles.footer}>
        {finished ? (
          <Button
            label="Nouvelle partie"
            onPress={() => setScreen('belote-setup')}
          />
        ) : (
          <Button
            label={`Reprendre la saisie (manche ${beloteGame.currentHand})`}
            onPress={() => goToBeloteHand(beloteGame.currentHand)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, gap: spacing.lg },
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
  sectionTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editHint: {
    color: colors.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: -spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
