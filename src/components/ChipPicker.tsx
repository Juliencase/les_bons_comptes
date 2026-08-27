// Sélecteur générique en pastilles — agnostique, piloté par props. Réutilisé
// pour tout choix exclusif présenté sous forme de courte liste. Deux gabarits
// (charte-da.md, maquettes 8c / 10a) :
// - 'pill' : pastilles mono défilables horizontalement (format, système) ;
// - 'grid' : cases égales en une ligne, gros chiffre BSD (score cible).
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';

export type ChipOption = {
  key: string;
  label: string;
};

type Props = {
  options: ChipOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  variant?: 'pill' | 'grid';
};

export default function ChipPicker({
  options,
  selectedKey,
  onSelect,
  variant = 'pill',
}: Props) {
  if (variant === 'grid') {
    return (
      <View style={styles.gridRow}>
        {options.map((opt) => {
          const selected = opt.key === selectedKey;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.gridCell,
                selected && styles.gridCellSelected,
                pressed && !selected && styles.gridCellPressed,
              ]}
            >
              <Text
                style={[styles.gridLabel, selected && styles.gridLabelSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillRow}
    >
      {options.map((opt) => {
        const selected = opt.key === selectedKey;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.pillSelected,
              pressed && !selected && styles.pillPressed,
            ]}
          >
            <Text
              style={[styles.pillLabel, selected && styles.pillLabelSelected]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row', gap: 6 },
  pill: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: alpha.creme(0.28),
  },
  pillPressed: { borderColor: colors.creme },
  pillSelected: { backgroundColor: colors.paille, borderColor: colors.paille },
  pillLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 11 * 0.06,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  pillLabelSelected: { color: colors.fond },
  gridRow: { flexDirection: 'row', gap: 6 },
  gridCell: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: alpha.creme(0.28),
  },
  gridCellPressed: { borderColor: colors.creme },
  gridCellSelected: {
    backgroundColor: colors.paille,
    borderColor: colors.paille,
  },
  gridLabel: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
    color: colors.creme,
  },
  gridLabelSelected: { color: colors.fond },
});
