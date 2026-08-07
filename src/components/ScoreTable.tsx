// Tableau récapitulatif : lignes = manches, colonnes = joueurs, dernière ligne = total.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, goldTint, opacity, radius, spacing } from '../theme';
import {
  cardsForRound,
  cumulativeTotals,
  isEntryComplete,
  roundTotal,
} from '../lib/scoring';
import { formatSignedScore } from '../lib/format';
import { Game } from '../lib/types';

const NAME_COL = 120;
const CELL = 68;

type Props = {
  game: Game;
  /** Si fourni, chaque ligne de manche devient touchable pour la corriger (ex. après la fin de la partie). */
  onRoundPress?: (round: number) => void;
};

export default function ScoreTable({ game, onRoundPress }: Props) {
  const totals = cumulativeTotals(game);
  const rounds = Array.from({ length: game.totalRounds }, (_, i) => i + 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        {/* En-tête : noms des joueurs */}
        <View style={styles.row}>
          <View style={[styles.corner]}>
            <Text style={styles.cornerText}>Manche</Text>
          </View>
          {game.players.map((p) => (
            <View key={p.id} style={styles.headCell}>
              <Text style={styles.headText} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Lignes des manches */}
        {rounds.map((r) => {
          // Le surlignage « manche en cours » n'a de sens que pendant une partie
          // active : après la fin, currentRound ne fait que suivre la dernière
          // manche ouverte pour correction, ce n'est plus « la » manche en cours.
          const isCurrent = !game.finishedAt && r === game.currentRound;
          return (
            <Pressable
              key={r}
              disabled={!onRoundPress}
              onPress={() => onRoundPress?.(r)}
              style={({ pressed }) => [
                styles.row,
                isCurrent && styles.currentRow,
                pressed && onRoundPress && styles.pressedRow,
              ]}
            >
              <View style={[styles.roundLabel, isCurrent && styles.currentRoundLabel]}>
                <Text style={[styles.roundLabelText, isCurrent && styles.currentRoundLabelText]}>
                  {isCurrent && '▶ '}{r}
                  <Text style={styles.roundCards}>  ({cardsForRound(r)} c.)</Text>
                  {onRoundPress && <Text style={styles.editHint}>  ✎</Text>}
                </Text>
              </View>
              {game.players.map((p) => {
                const entry = game.rounds[r]?.[p.id];
                const done = isEntryComplete(entry) && entry?.validated;
                const val = done ? roundTotal(entry, cardsForRound(r)) : null;
                return (
                  <View key={p.id} style={[styles.cell, isCurrent && styles.currentCell]}>
                    <Text
                      style={[
                        styles.cellText,
                        val == null
                          ? styles.cellEmpty
                          : val >= 0
                            ? styles.positive
                            : styles.negative,
                      ]}
                    >
                      {val == null ? '·' : formatSignedScore(val)}
                    </Text>
                  </View>
                );
              })}
            </Pressable>
          );
        })}

        {/* Total */}
        <View style={[styles.row, styles.totalRow]}>
          <View style={styles.roundLabel}>
            <Text style={styles.totalLabelText}>Total</Text>
          </View>
          {game.players.map((p) => (
            <View key={p.id} style={styles.cell}>
              <Text style={styles.totalText}>{totals[p.id]}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  currentRow: { backgroundColor: goldTint.subtle },
  pressedRow: { opacity: opacity.pressedSubtle },
  corner: {
    width: NAME_COL,
    padding: spacing.sm,
    backgroundColor: colors.bgAlt,
    borderWidth: 0.5,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  cornerText: { color: colors.textDim, fontWeight: '700', fontSize: 12 },
  headCell: {
    width: CELL,
    padding: spacing.sm,
    backgroundColor: colors.bgAlt,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  roundLabel: {
    width: NAME_COL,
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  currentRoundLabel: { backgroundColor: goldTint.strong, borderColor: colors.gold },
  roundLabelText: { color: colors.text, fontWeight: '600' },
  currentRoundLabelText: { color: colors.gold, fontWeight: '700' },
  roundCards: { color: colors.textDim, fontWeight: '400', fontSize: 12 },
  editHint: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  cell: {
    width: CELL,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCell: { backgroundColor: goldTint.subtle, borderColor: goldTint.border },
  cellText: { fontSize: 14, fontWeight: '600' },
  cellEmpty: { color: colors.textDim },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  totalRow: {},
  totalLabelText: { color: colors.gold, fontWeight: '800' },
  totalText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
});
