// Sélecteur exclusif à 2 options (+ « aucune » optionnelle) — agnostique, piloté
// par props (charte-da.md, maquette 9d « Équipe preneuse »). Utilisé pour les
// équipes de Belote (preneur, capot, Belote-Rebelote) et pour le type de mise
// Rascal (chevrotine / boulet de canon).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';

export type SegmentedOption<T extends string> = {
  id: T;
  name: string;
};

type Props<T extends string> = {
  options: [SegmentedOption<T>, SegmentedOption<T>];
  selectedId: T | null;
  onSelect: (id: T | null) => void;
  /** Ajoute un bouton « aucune option » (ex. pas de Belote-Rebelote cette manche). */
  allowNone?: boolean;
  noneLabel?: string;
};

export default function SegmentedToggle<T extends string>({
  options,
  selectedId,
  onSelect,
  allowNone,
  noneLabel = 'Aucune',
}: Props<T>) {
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
              pressed && !selected && styles.pillPressed,
            ]}
          >
            <Text
              style={[styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
            >
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
            selectedId === null && styles.pillNoneSelected,
            pressed && selectedId !== null && styles.pillPressed,
          ]}
        >
          <Text
            style={[
              styles.noneLabel,
              selectedId === null && styles.noneLabelSelected,
            ]}
            numberOfLines={1}
          >
            {noneLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: alpha.creme(0.28),
  },
  pillPressed: { borderColor: colors.creme },
  pillSelected: {
    backgroundColor: colors.sanguine,
    borderColor: colors.sanguine,
  },
  label: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: 26,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  labelSelected: { color: colors.fond },
  pillNone: {
    flex: 0.8,
    borderStyle: 'dashed',
    borderColor: alpha.creme(0.24),
  },
  pillNoneSelected: {
    backgroundColor: alpha.creme(0.12),
    borderStyle: 'solid',
    borderColor: alpha.creme(0.32),
  },
  noneLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 11 * 0.1,
    textTransform: 'uppercase',
    color: alpha.creme(0.6),
  },
  noneLabelSelected: { color: colors.creme },
});
