// Bloc de champ de saisie manche : libellé (+ « max N » optionnel) puis
// contenu — un seul patron pour cadrer libellé/valeur (charte-da.md §06).
// Partagé par les vues de saisie de manche Skull King (mise, plis, bonus, type
// de mise), fraîches ou en correction.
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, fonts } from '../theme';

type Props = {
  label: string;
  /** Borne haute affichée à droite du libellé (ex. « max 5 »), si pertinente. */
  max?: number;
  children: ReactNode;
};

export default function RoundField({ label, max, children }: Props) {
  return (
    <View style={styles.field}>
      {max != null ? (
        <View style={styles.fieldHead}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldMax}>max {max}</Text>
        </View>
      ) : (
        <Text style={styles.fieldLabel}>{label}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  fieldHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  fieldLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
  },
  fieldMax: { fontFamily: fonts.mono, fontSize: 10, color: alpha.creme(0.4) },
});
