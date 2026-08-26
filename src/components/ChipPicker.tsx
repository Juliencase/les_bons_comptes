// Sélecteur générique en chips horizontales — agnostique, piloté par props.
// Réutilisé pour tout choix exclusif présenté sous forme de courte liste
// (format de partie, score cible, etc.) afin de garder une seule implémentation.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, goldTint, opacity, radius, spacing } from '../theme';

export type ChipOption = {
  key: string;
  label: string;
  sublabel?: string;
};

type Props = {
  options: ChipOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

export default function ChipPicker({ options, selectedKey, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
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
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {opt.label}
            </Text>
            {opt.sublabel != null && (
              <Text
                style={[styles.sublabel, selected && styles.sublabelSelected]}
              >
                {opt.sublabel}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { borderColor: colors.gold, backgroundColor: goldTint.medium },
  pressed: { opacity: opacity.pressed },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  labelSelected: { color: colors.gold },
  sublabel: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  sublabelSelected: { color: colors.goldSoft },
});
