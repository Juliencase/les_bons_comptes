// Pastille informative sanguine/fond/mono — pas un contrôle (charte-da.md §06).
// Partagée par RoundPlayerFrame (« Joueur X / Y »), BidKindField (type de mise
// en lecture seule) et GameCard (« En cours · manche NN »). Le texte est passé
// déjà dans la casse voulue par l'appelant (ex. `.toUpperCase()`) plutôt que
// via un flag dédié.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = {
  label: string;
};

export default function Badge({ label }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sanguine,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  text: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 10 * 0.12,
    color: colors.fond,
  },
});
