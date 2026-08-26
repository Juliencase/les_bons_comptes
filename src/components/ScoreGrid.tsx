// Grille récapitulative générique : lignes = manches/mains, colonnes = joueurs/équipes,
// dernière ligne = total. Utilisée par ScoreTable (Skull King) et BeloteHandTable (Belote) —
// ces deux jeux partagent la même forme de tableau, seule la donnée par ligne diffère.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, goldTint, opacity, spacing } from '../theme';
import { formatSignedScore } from '../lib/format';

const NAME_COL = 120;

export type ScoreGridColumn = {
  id: string;
  label: string;
};

export type ScoreGridRow = {
  key: number;
  /** Contenu affiché dans la cellule de gauche (peut inclure des sous-infos, ex. "(3 c.)"). */
  labelExtra?: React.ReactNode;
  isCurrent: boolean;
  /** Valeur par colonne ; `null`/`undefined` affiche « · » (cellule vide, ex. manche non validée). */
  values: Record<string, number | null | undefined>;
};

type Props = {
  columns: ScoreGridColumn[];
  rows: ScoreGridRow[];
  totals: Record<string, number>;
  cellWidth: number;
  onRowPress?: (key: number) => void;
};

export default function ScoreGrid({
  columns,
  rows,
  totals,
  cellWidth,
  onRowPress,
}: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={styles.row}>
          <View style={styles.corner}>
            <Text style={styles.cornerText}>Manche</Text>
          </View>
          {columns.map((c) => (
            <View key={c.id} style={[styles.headCell, { width: cellWidth }]}>
              <Text style={styles.headText} numberOfLines={1}>
                {c.label}
              </Text>
            </View>
          ))}
        </View>

        {rows.map((r) => (
          <Pressable
            key={r.key}
            disabled={!onRowPress}
            onPress={() => onRowPress?.(r.key)}
            style={({ pressed }) => [
              styles.row,
              r.isCurrent && styles.currentRow,
              pressed && onRowPress && styles.pressedRow,
            ]}
          >
            <View
              style={[
                styles.roundLabel,
                r.isCurrent && styles.currentRoundLabel,
              ]}
            >
              <Text
                style={[
                  styles.roundLabelText,
                  r.isCurrent && styles.currentRoundLabelText,
                ]}
              >
                {r.isCurrent && '▶ '}
                {r.key}
                {r.labelExtra}
                {onRowPress && <Text style={styles.editHint}> ✎</Text>}
              </Text>
            </View>
            {columns.map((c) => {
              const val = r.values[c.id];
              return (
                <View
                  key={c.id}
                  style={[
                    styles.cell,
                    { width: cellWidth },
                    r.isCurrent && styles.currentCell,
                  ]}
                >
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
        ))}

        <View style={[styles.row, styles.totalRow]}>
          <View style={styles.roundLabel}>
            <Text style={styles.totalLabelText}>Total</Text>
          </View>
          {columns.map((c) => (
            <View key={c.id} style={[styles.cell, { width: cellWidth }]}>
              <Text style={styles.totalText}>{totals[c.id]}</Text>
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
  currentRoundLabel: {
    backgroundColor: goldTint.strong,
    borderColor: colors.gold,
  },
  roundLabelText: { color: colors.text, fontWeight: '600' },
  currentRoundLabelText: { color: colors.gold, fontWeight: '700' },
  editHint: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  cell: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCell: {
    backgroundColor: goldTint.subtle,
    borderColor: goldTint.border,
  },
  cellText: { fontSize: 14, fontWeight: '600' },
  cellEmpty: { color: colors.textDim },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
  totalRow: {},
  totalLabelText: { color: colors.gold, fontWeight: '800' },
  totalText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
});
