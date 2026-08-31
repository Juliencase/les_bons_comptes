// Alerte non bloquante : filet gauche paille 4 px, fond paille 8 %, jamais de
// bouton (charte §06/§09 — les incohérences de saisie restent informatives).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';

export default function Callout({ children }: { children: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.paille,
    backgroundColor: alpha.paille(0.08),
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.8),
  },
});
