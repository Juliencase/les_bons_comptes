// Ligne de saisie d'un joueur pour la manche courante : mise, plis, bonus + score live.
// En système Rascal, s'y ajoute (si l'option est active) le type de mise, et le
// pied de carte annonce la précision obtenue plutôt qu'un simple libellé.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Stepper from './Stepper';
import BonusButtons from './BonusButtons';
import SegmentedToggle from './SegmentedToggle';
import { colors, radius, spacing } from '../theme';
import {
  bidKindOf,
  DEFAULT_BID_KIND,
  isEntryComplete,
  rascalOutcome,
  rascalPotential,
  RascalOutcome,
  roundTotal,
} from '../lib/scoring';
import { BID_KINDS } from '../lib/scoreSystems';
import { formatSignedScore } from '../lib/format';
import { BidKind, RoundEntry, ScoreSystem } from '../lib/types';

/** Libellés de précision du système Rascal (cf. docs/REGLES_SKULL_KING.md §4.B). */
const OUTCOME_LABELS: Record<RascalOutcome, string> = {
  direct: '🎯 Coup direct',
  graze: '💥 Frappe à revers',
  miss: '💨 Échec cuisant',
};

type Props = {
  name: string;
  cumulative: number;
  entry: RoundEntry;
  cards: number;
  system: ScoreSystem;
  /** Option Rascal : affiche le choix chevrotine / boulet de canon. */
  cannonballRule?: boolean;
  onBid: (v: number) => void;
  onTricks: (v: number) => void;
  onBonus: (v: number) => void;
  onBidKind: (kind: BidKind) => void;
};

export default function PlayerRoundRow({
  name,
  cumulative,
  entry,
  cards,
  system,
  cannonballRule,
  onBid,
  onTricks,
  onBonus,
  onBidKind,
}: Props) {
  const complete = isEntryComplete(entry);
  const rascal = system === 'rascal';
  const bidKind = bidKindOf(entry);
  const roundScore = complete ? roundTotal(entry, cards, system) : null;
  const outcome =
    rascal && complete
      ? rascalOutcome(entry.bid as number, entry.tricks as number, bidKind)
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
            decrementLabel="Diminuer la mise"
            incrementLabel="Augmenter la mise"
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
            decrementLabel="Diminuer les plis"
            incrementLabel="Augmenter les plis"
          />
        </View>
      </View>

      {rascal && cannonballRule && (
        <View style={styles.bidKindRow}>
          <Text style={styles.label}>Type de mise</Text>
          <SegmentedToggle
            options={[
              { id: BID_KINDS[0].key, name: BID_KINDS[0].name },
              { id: BID_KINDS[1].key, name: BID_KINDS[1].name },
            ]}
            selectedId={bidKind}
            onSelect={(id) => onBidKind(id ?? DEFAULT_BID_KIND)}
          />
        </View>
      )}

      <View style={styles.bonusRow}>
        <Text style={styles.label}>{rascal ? 'Bonus (pondéré)' : 'Bonus'}</Text>
        <BonusButtons value={entry.bonus ?? 0} onChange={onBonus} />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLabels}>
          <Text style={styles.footerLabel}>
            {outcome ? OUTCOME_LABELS[outcome] : 'Score manche'}
          </Text>
          {/* Sans boulet de canon le potentiel est le même pour tous : il est
              annoncé une fois dans l'en-tête de la manche, pas sur chaque carte. */}
          {rascal && cannonballRule && (
            <Text style={styles.footerHint}>
              Potentiel {rascalPotential(cards, bidKind)} pts
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.roundScore,
            roundScore == null
              ? styles.roundScoreEmpty
              : roundScore > 0
                ? styles.positive
                : roundScore < 0
                  ? styles.negative
                  : // Un « échec cuisant » vaut exactement 0 : ni vert ni rouge,
                    // sinon la couleur dit l'inverse du libellé juste à côté.
                    styles.roundScoreZero,
          ]}
        >
          {roundScore == null ? '—' : formatSignedScore(roundScore)}
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
  bidKindRow: { marginTop: spacing.md },
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
  footerLabels: { flexShrink: 1 },
  footerLabel: { color: colors.textDim, fontSize: 13 },
  footerHint: { color: colors.textDim, fontSize: 11, opacity: 0.8 },
  roundScore: { fontSize: 18, fontWeight: '800' },
  roundScoreEmpty: { color: colors.textDim },
  roundScoreZero: { color: colors.textDim },
  positive: { color: colors.positive },
  negative: { color: colors.negative },
});
