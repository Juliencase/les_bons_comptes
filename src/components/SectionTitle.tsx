// Libellé de section en petites majuscules espacées (ex. au-dessus d'un ChipPicker).
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  children: string;
};

export default function SectionTitle({ children }: Props) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
});
