// Écran tableau des scores + classement / vainqueur.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ScoreTable from '../components/ScoreTable';
import ScreenHeader from '../components/ScreenHeader';
import { useStore } from '../lib/store';
import { ranking } from '../lib/scoring';
import { colors, radius, spacing } from '../theme';

const MEDALS = ['🥇', '🥈', '🥉'];

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
        left={<BackButton label="Accueil" onPress={() => setScreen('home')} />}
        title={finished ? 'Résultat final' : 'Scores'}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {finished && rows.length > 0 && (
          <View style={styles.winnerCard}>
            <Text style={styles.winnerLabel}>Capitaine des Sept Mers</Text>
            <Text style={styles.winnerName}>🏴‍☠️ {nameOf(rows[0].playerId)}</Text>
            <Text style={styles.winnerScore}>{rows[0].total} points</Text>
          </View>
        )}

        {/* Classement */}
        <View style={styles.ranking}>
          {rows.map((row) => (
            <View key={row.playerId} style={styles.rankRow}>
              <Text style={styles.rankPos}>
                {row.rank <= 3 ? MEDALS[row.rank - 1] : `${row.rank}.`}
              </Text>
              <Text style={styles.rankName} numberOfLines={1}>
                {nameOf(row.playerId)}
              </Text>
              <Text
                style={[
                  styles.rankScore,
                  row.total >= 0 ? styles.positive : styles.negative,
                ]}
              >
                {row.total}
              </Text>
            </View>
          ))}
        </View>

        {/* Détail par manche */}
        <Text style={styles.sectionTitle}>Détail des manches</Text>
        <ScoreTable game={game} />
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
  winnerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  winnerLabel: {
    color: colors.textDim,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerName: { color: colors.gold, fontSize: 26, fontWeight: '800' },
  winnerScore: { color: colors.text, fontSize: 18, fontWeight: '700' },
  ranking: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rankPos: { fontSize: 18, width: 40 },
  rankName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  rankScore: { fontSize: 18, fontWeight: '800' },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
