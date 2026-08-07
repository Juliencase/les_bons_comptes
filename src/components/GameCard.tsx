// Carte de sélection d'un jeu — agnostique, pilotée par props.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, opacity, radius, spacing } from '../theme';

type Props = {
  emoji: string;
  name: string;
  subtitle: string;
  available: boolean;
  /** Libellé du badge à droite (ex. « En cours », « Bientôt »). Sinon, un chevron. */
  badgeLabel?: string;
  /** Badge en style neutre (« Bientôt ») plutôt qu'en accent (« En cours »). */
  badgeSoon?: boolean;
  onPress: () => void;
};

export default function GameCard({
  emoji,
  name,
  subtitle,
  available,
  badgeLabel,
  badgeSoon,
  onPress,
}: Props) {
  return (
    <Pressable
      disabled={!available}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !available && styles.cardDisabled,
        pressed && available && styles.pressed,
      ]}
    >
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, !available && styles.cardNameDim]}>{name}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      {badgeLabel ? (
        <View style={[styles.badge, badgeSoon && styles.badgeSoon]}>
          <Text style={[styles.badgeText, badgeSoon && styles.badgeSoonText]}>
            {badgeLabel}
          </Text>
        </View>
      ) : available ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardDisabled: { opacity: 0.55 }, // dim volontairement plus léger qu'un vrai « disabled » : le libellé « Bientôt » doit rester lisible.
  pressed: { opacity: opacity.pressed },
  cardEmoji: { fontSize: 34 },
  cardBody: { flex: 1 },
  cardName: { color: colors.text, fontSize: 19, fontWeight: '800' },
  cardNameDim: { color: colors.textDim },
  cardSubtitle: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.gold, fontSize: 28, fontWeight: '700' },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
  },
  badgeText: { color: colors.bg, fontSize: 12, fontWeight: '800' },
  badgeSoon: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  badgeSoonText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
});
