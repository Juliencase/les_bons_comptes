// Ligne de saisie d'un joueur pour la manche courante : mise, plis, bonus + score live.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Stepper from './Stepper';
import BonusButtons from './BonusButtons';
import { colors, radius, spacing } from '../theme';
import { bidScore, isEntryComplete } from '../lib/scoring';
import { RoundEntry } from '../lib/types';

type Props = {
  name: string;
  cumulative: number;
  entry: RoundEntry;
  cards: number;
  onBid: (v: number) => void;
  onTricks: (v: number) => void;
  onBonus: (v: number) => void;
};

export default function PlayerRoundRow({
  name,
  cumulative,
  entry,
  cards,
  onBid,
  onTricks,
  onBonus,
}: Props) {
  const complete = isEntryComplete(entry);
  const roundScore = complete
    ? bidScore(entry.bid as number, entry.tricks as number, cards) +
      (entry.bonus ?? 0)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.cumulative}>{cumulative} pts</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.field}>
          <Text style={styles.label}>Mise</Text>
          <Stepper
            value={entry.bid}
            min={0}
            max={cards}
            onChange={onBid}
            accent={colors.gold}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Plis</Text>
          <Stepper
            value={entry.tricks}
            min={0}
            max={cards}
            onChange={onTricks}
            accent={colors.goldSoft}
          />
        </View>
      </View>

      <View style={styles.bonusRow}>
        <Text style={styles.label}>Bonus</Text>
        <BonusButtons value={entry.bonus ?? 0} onChange={onBonus} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Score manche</Text>
        <Text
          style={[
            styles.roundScore,
            roundScore == null
              ? styles.roundScoreEmpty
              : roundScore >= 0
                ? styles.positive
                : styles.negative,
          ]}
        >
          {roundScore == null
            ? '—'
            : roundScore > 0
              ? `+${roundScore}`
              : `${roundScore}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  cumulative: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  field: { alignItems: 'center' },
  label: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bonusRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: { color: colors.textDim, fontSize: 13 },
  roundScore: { fontSize: 18, fontWeight: '800' },
  roundScoreEmpty: { color: colors.textDim },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
});
