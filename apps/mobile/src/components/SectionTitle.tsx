// Libellé de section, sanguine, avec numérotation optionnelle (« 01 · Joueurs »).
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';

type Props = {
  index?: string;
  children: string;
};

export default function SectionTitle({ index, children }: Props) {
  return (
    <Text style={styles.title}>
      {index != null ? `${index} · ${children}` : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.sanguine,
    marginBottom: 10,
  },
});
