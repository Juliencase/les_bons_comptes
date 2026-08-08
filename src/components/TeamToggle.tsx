// Sélecteur d'équipe (2 options + « aucune » optionnelle) — agnostique, piloté par props.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, goldTint, opacity, radius, spacing } from '../theme';

export type TeamToggleOption = {
  id: string;
  name: string;
};

type Props = {
  options: [TeamToggleOption, TeamToggleOption];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Ajoute un bouton « aucune équipe » (ex. pas de Belote-Rebelote cette manche). */
  allowNone?: boolean;
  noneLabel?: string;
};

export default function TeamToggle({
  options,
  selectedId,
  onSelect,
  allowNone,
  noneLabel = 'Aucune',
}: Props) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.pillSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {opt.name}
            </Text>
          </Pressable>
        );
      })}
      {allowNone && (
        <Pressable
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId === null }}
          style={({ pressed }) => [
            styles.pill,
            styles.pillNone,
            selectedId === null && styles.pillSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.label, selectedId === null && styles.labelSelected]}>
            {noneLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillNone: { flex: 0.7 },
  pillSelected: { borderColor: colors.gold, backgroundColor: goldTint.medium },
  pressed: { opacity: opacity.pressed },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  labelSelected: { color: colors.gold },
});
