// Liste de classement : médaille/rang, nom, score total.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const MEDALS = ['🥇', '🥈', '🥉'];

export type RankingRow = {
  id: string;
  name: string;
  rank: number;
  total: number;
};

export default function RankingList({ rows }: { rows: RankingRow[] }) {
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <Text style={styles.pos}>
            {row.rank <= 3 ? MEDALS[row.rank - 1] : `${row.rank}.`}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {row.name}
          </Text>
          <Text style={[styles.score, row.total >= 0 ? styles.positive : styles.negative]}>
            {row.total}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pos: { fontSize: 18, width: 40 },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  score: { fontSize: 18, fontWeight: '800' },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
});
