// Grille récapitulative générique : lignes = manches/mains, colonnes = joueurs/équipes
// en largeurs égales (charte-da.md, maquette 9b/10b — pas de défilement horizontal,
// les noms sont abrégés en tête de colonne par l'appelant si besoin). Utilisée par
// ScoreTable (Skull King) et BeloteHandTable (Belote) — ces deux jeux partagent la
// même forme de tableau, seule la donnée et le calcul de ton par ligne diffèrent.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';
import { formatSignedScore } from '../lib/format';

const LABEL_COL = 62;

export type ScoreGridColumn = {
  id: string;
  label: string;
};

export type ScoreGridTone = 'gain' | 'loss' | 'neutral';

export type ScoreGridRow = {
  key: number;
  /** Sous-ligne sous le numéro de manche (ex. "7 cartes", "Eux · chute"). */
  labelExtra?: string;
  isCurrent: boolean;
  /** Valeur + ton par colonne ; `null` affiche « · » (manche non validée pour ce joueur). */
  values: Record<string, { value: number; tone: ScoreGridTone } | null>;
};

type Props = {
  columns: ScoreGridColumn[];
  rows: ScoreGridRow[];
  onRowPress?: (key: number) => void;
};

export default function ScoreGrid({ columns, rows, onRowPress }: Props) {
  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.labelCol, { width: LABEL_COL }]} />
        {columns.map((c) => (
          <View key={c.id} style={styles.headCell}>
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
          accessibilityRole={onRowPress ? 'button' : undefined}
          style={({ pressed }) => [
            styles.row,
            styles.dataRow,
            r.isCurrent && styles.currentRow,
            pressed && !!onRowPress && styles.pressedRow,
          ]}
        >
          <View style={[styles.labelCol, { width: LABEL_COL }]}>
            <Text
              style={[
                styles.roundLabel,
                r.isCurrent && styles.currentRoundLabel,
              ]}
              numberOfLines={1}
            >
              {String(r.key).padStart(2, '0')}
            </Text>
            {r.labelExtra != null && (
              <Text style={styles.roundLabelExtra} numberOfLines={1}>
                {r.labelExtra}
              </Text>
            )}
          </View>
          {columns.map((c) => {
            const cell = r.values[c.id];
            return (
              <View key={c.id} style={styles.cell}>
                <Text
                  style={[
                    styles.cellText,
                    cell == null
                      ? styles.cellEmpty
                      : r.isCurrent
                        ? styles.cellPending
                        : cell.tone === 'gain'
                          ? styles.gain
                          : cell.tone === 'loss'
                            ? styles.loss
                            : styles.neutral,
                  ]}
                  numberOfLines={1}
                >
                  {cell == null ? '·' : formatSignedScore(cell.value)}
                </Text>
              </View>
            );
          })}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  dataRow: {
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.12),
  },
  currentRow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.sanguine,
    backgroundColor: alpha.sanguine(0.07),
  },
  pressedRow: { backgroundColor: alpha.creme(0.05) },
  labelCol: { justifyContent: 'center' },
  headCell: { flex: 1, alignItems: 'flex-end' },
  headText: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.1,
    textTransform: 'uppercase',
    color: alpha.creme(0.42),
  },
  roundLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.55),
  },
  currentRoundLabel: { color: colors.sanguine },
  roundLabelExtra: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: alpha.creme(0.4),
    marginTop: 1,
  },
  cell: { flex: 1, alignItems: 'flex-end' },
  cellText: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  cellEmpty: { color: alpha.creme(0.3) },
  cellPending: { color: alpha.creme(0.4) },
  gain: { color: colors.paille },
  loss: { color: colors.grenat },
  neutral: { color: colors.creme },
});
