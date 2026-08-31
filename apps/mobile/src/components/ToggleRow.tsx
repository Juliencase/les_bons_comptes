// Interrupteur pleine ligne (58×34) — toute la ligne se déclenche (charte §05).
// Utilisé pour l'option Rascal « Boulet de canon » (SetupScreen).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export default function ToggleRow({ title, subtitle, value, onChange }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={styles.row}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.16),
    paddingTop: 12,
    marginTop: 14,
  },
  text: { flexShrink: 1, gap: 4 },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 20 * 0.04,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 13,
    color: alpha.creme(0.5),
  },
  track: {
    width: 58,
    height: 34,
    padding: 4,
    justifyContent: 'center',
    backgroundColor: alpha.creme(0.16),
    borderWidth: 1,
    borderColor: alpha.creme(0.28),
  },
  trackOn: { backgroundColor: colors.paille, borderWidth: 0 },
  knob: { width: 24, height: 24, backgroundColor: alpha.creme(0.6) },
  knobOn: { backgroundColor: colors.fond, alignSelf: 'flex-end' },
});
