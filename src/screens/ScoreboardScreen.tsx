// Écran tableau des scores + classement / vainqueur.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import RankingList from '../components/RankingList';
import ScoreTable from '../components/ScoreTable';
import ScreenHeader from '../components/ScreenHeader';
import WinnerCard from '../components/WinnerCard';
import { useStore } from '../lib/store';
import { ranking } from '../lib/scoring';
import { colors, spacing } from '../theme';

export default function ScoreboardScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const goToRound = useStore((s) => s.goToRound);

  if (!game) return null;

  const finished = !!game.finishedAt;
  const rows = ranking(game);
  const nameOf = (id: string) =>
    game.players.find((p) => p.id === id)?.name ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        left={
          <BackButton
            label={finished ? 'Accueil' : 'Retour'}
            onPress={() => finished ? setScreen('home') : goToRound(game.currentRound)}
          />
        }
        title={finished ? 'Résultat final' : 'Scores'}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {finished && rows.length > 0 && (
          <WinnerCard
            label="Capitaine des Sept Mers"
            name={nameOf(rows[0].playerId)}
            score={rows[0].total}
          />
        )}

        <RankingList
          rows={rows.map((row) => ({
            id: row.playerId,
            name: nameOf(row.playerId),
            rank: row.rank,
            total: row.total,
          }))}
        />

        {/* Détail par manche */}
        <Text style={styles.sectionTitle}>Détail des manches</Text>
        {finished && (
          <Text style={styles.editHint}>Touche une manche pour corriger un score.</Text>
        )}
        <ScoreTable game={game} onRoundPress={finished ? goToRound : undefined} />
      </ScrollView>

      <View style={styles.footer}>
        {finished ? (
          <Button label="Nouvelle partie" onPress={() => setScreen('setup')} />
        ) : (
          <Button
            label={`Reprendre la saisie (manche ${game.currentRound})`}
            onPress={() => goToRound(game.currentRound)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, gap: spacing.lg },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editHint: { color: colors.textDim, fontSize: 12, fontStyle: 'italic', marginTop: -spacing.sm },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
