// Rappel du score de la manche en cours pour le joueur affiché (« Cette
// manche ») — filet supérieur, couleur qui signifie gain/perte (charte §01/§03).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';
import { formatSignedScore } from '../lib/format';

type Props = {
  /** null tant que la manche du joueur n'est pas complète. */
  score: number | null;
};

export default function RoundScoreReadout({ score }: Props) {
  return (
    <View style={styles.footer}>
      <Text style={styles.label}>Cette manche</Text>
      <Text
        style={[
          styles.value,
          score == null
            ? styles.empty
            : score > 0
              ? styles.gain
              : score < 0
                ? styles.loss
                : styles.empty,
        ]}
      >
        {score == null ? '—' : formatSignedScore(score)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.16),
    paddingTop: 14,
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
  },
  value: {
    fontFamily: fonts.displayBlack,
    fontSize: 42,
    lineHeight: 42,
    fontVariant: ['tabular-nums'],
  },
  empty: { color: alpha.creme(0.4) },
  gain: { color: colors.paille },
  loss: { color: colors.grenat },
});
