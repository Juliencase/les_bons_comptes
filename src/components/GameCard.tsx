// Tuile de sélection d'un jeu (grille 2 colonnes) — agnostique, pilotée par props.
import React from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, goldGradient, opacity, radius, spacing } from '../theme';

// Grille 2 colonnes avec padding xl (écran) + gap md (entre tuiles) —
// cf. GamesScreen. On calcule la taille de tuile en pixels pour dimensionner
// l'image en dur : <Image> retombe sur sa taille intrinsèque si son cadre
// n'est pas résolu en pixels (% + aspectRatio sur une Image ne suffit pas).
const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2;
const IMAGE_FRAME_WIDTH = TILE_SIZE * 0.76;
const IMAGE_FRAME_HEIGHT = TILE_SIZE * 0.58;

type Props = {
  emoji: string;
  /** Illustration du jeu ; prioritaire sur `emoji` si fournie. */
  image?: ImageSourcePropType;
  name: string;
  subtitle: string;
  available: boolean;
  /** Libellé du badge (ex. « En cours »). Affiché seulement si `available`. */
  badgeLabel?: string;
  onPress: () => void;
};

export default function GameCard({
  emoji,
  image,
  name,
  subtitle,
  available,
  badgeLabel,
  onPress,
}: Props) {
  if (!available) {
    return (
      <View style={styles.tile}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>{emoji}</Text>
          <Text style={styles.placeholderName} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.placeholderSoon}>Bientôt</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {image && (
        <Image source={image} style={styles.image} resizeMode="contain" />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(15,32,39,0.95)']}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {badgeLabel && (
        <LinearGradient colors={goldGradient} style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </LinearGradient>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgAlt,
  },
  image: {
    position: 'absolute',
    top: TILE_SIZE * 0.12,
    left: TILE_SIZE * 0.12,
    width: IMAGE_FRAME_WIDTH,
    height: IMAGE_FRAME_HEIGHT,
    maxWidth: IMAGE_FRAME_WIDTH,
    maxHeight: IMAGE_FRAME_HEIGHT,
  },
  pressed: { opacity: opacity.pressed },
  placeholder: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    opacity: 0.6,
  },
  placeholderEmoji: { fontSize: 26 },
  placeholderName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  placeholderSoon: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  badgeText: { color: colors.bg, fontSize: 9, fontWeight: '800' },
  body: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 10,
  },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  subtitle: { color: colors.gold, fontSize: 10, fontWeight: '700', marginTop: 2 },
});
