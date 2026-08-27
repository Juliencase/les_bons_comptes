// Tuile de sélection d'un jeu — pleine largeur, empilées (maquette 8a) —
// agnostique, pilotée par props. 100 % typographique : pas d'image ni d'emoji
// (charte §09).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playerRange } from '../lib/games';
import { alpha, colors, fonts } from '../theme';

type Props = {
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  durationMin?: number;
  available: boolean;
  /** Libellé du badge (ex. « En cours · manche 07 »). Affiché seulement si `available`. */
  badgeLabel?: string;
  onPress: () => void;
};

export default function GameCard({
  name,
  tagline,
  minPlayers,
  maxPlayers,
  durationMin,
  available,
  badgeLabel,
  onPress,
}: Props) {
  if (!available) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderName} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.soonPill}>
          <Text style={styles.soonText}>Bientôt</Text>
        </View>
      </View>
    );
  }

  const meta = `${tagline} · ${playerRange({ minPlayers, maxPlayers })} joueurs${
    durationMin != null ? ` · ${durationMin} min` : ''
  }`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        badgeLabel != null && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.top}>
        {badgeLabel != null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        ) : (
          <View />
        )}
        <Text style={styles.arrow}>→</Text>
      </View>
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    padding: 16,
    gap: 26,
  },
  cardActive: { borderLeftWidth: 4, borderLeftColor: colors.sanguine },
  cardPressed: { borderColor: colors.sanguine },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  arrow: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: 26,
    color: alpha.creme(0.4),
  },
  badge: {
    backgroundColor: colors.sanguine,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.14,
    textTransform: 'uppercase',
    color: colors.fond,
  },
  name: {
    fontFamily: fonts.displayBlack,
    fontSize: 44,
    lineHeight: Math.round(44 * 0.86),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.55),
    marginTop: 8,
  },
  placeholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: alpha.creme(0.2),
    padding: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  placeholderName: {
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    lineHeight: Math.round(30 * 0.9),
    textTransform: 'uppercase',
    color: alpha.creme(0.34),
  },
  soonPill: {
    borderWidth: 1,
    borderColor: alpha.creme(0.24),
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  soonText: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.14,
    textTransform: 'uppercase',
    color: alpha.creme(0.34),
  },
});
