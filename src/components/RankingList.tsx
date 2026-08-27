// Liste de classement : rang, nom, méta optionnelle, score total (charte §06 —
// filet gauche paille 4 px sur le premier rang, pas de médaille). Le
// classement se réordonne en douceur (§07, 550 ms) et le total compte
// jusqu'à sa nouvelle valeur plutôt que de sauter.
import React, { useEffect } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import AnimatedNumber from './AnimatedNumber';
import { alpha, colors, fonts } from '../theme';
import { useReducedMotion } from '../lib/reducedMotion';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const RANK_SWAP_MS = 550;
const RANK_SWAP_ANIMATION = {
  duration: RANK_SWAP_MS,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

export type RankingRow = {
  id: string;
  name: string;
  rank: number;
  total: number;
  /** Info courte optionnelle (ex. « 18 plis »). */
  meta?: string;
};

export default function RankingList({ rows }: { rows: RankingRow[] }) {
  const reducedMotion = useReducedMotion();
  const order = rows.map((r) => `${r.id}:${r.rank}`).join(',');

  useEffect(() => {
    if (!reducedMotion) LayoutAnimation.configureNext(RANK_SWAP_ANIMATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const first = row.rank === 1;
        return (
          <View key={row.id} style={[styles.row, first && styles.rowFirst]}>
            <Text style={[styles.rank, first && styles.rankFirst]}>
              {row.rank}
            </Text>
            <Text style={styles.name} numberOfLines={1}>
              {row.name}
            </Text>
            {row.meta != null && (
              <Text style={styles.meta} numberOfLines={1}>
                {row.meta}
              </Text>
            )}
            <AnimatedNumber
              value={row.total}
              signed
              style={[
                styles.total,
                first
                  ? styles.totalFirst
                  : row.total < 0
                    ? styles.totalLoss
                    : null,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  rowFirst: { borderLeftWidth: 4, borderLeftColor: colors.paille },
  rank: {
    width: 26,
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: 26,
    color: alpha.creme(0.45),
    fontVariant: ['tabular-nums'],
  },
  rankFirst: { color: colors.paille },
  name: {
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 26,
    lineHeight: 26,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.45),
  },
  total: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
    lineHeight: 34,
    color: colors.creme,
    fontVariant: ['tabular-nums'],
  },
  totalFirst: { color: colors.paille },
  totalLoss: { color: colors.grenat },
});
