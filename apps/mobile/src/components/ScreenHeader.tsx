// Rangée d'en-tête générique : slots gauche/droite (retour, pastille d'action).
// Le grand titre d'écran n'y vit plus (charte/maquettes 8c/9a/10a : le titre
// est un bloc BSD 900 affiché sous cette rangée, pas centré dans une barre) —
// chaque écran le rend lui-même avec `type.screenTitle()`.
import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { alpha } from '../theme';

type Props = {
  left?: ReactNode;
  right?: ReactNode;
  /** Filet de séparation avec le contenu en dessous, si besoin. */
  bordered?: boolean;
};

export default function ScreenHeader({ left, right, bordered }: Props) {
  return (
    <View style={[styles.header, bordered && styles.bordered]}>
      <View style={styles.side}>{left}</View>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: alpha.creme(0.16),
    paddingBottom: 14,
  },
  side: { flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
});
