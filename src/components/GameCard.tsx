// Tuile de sélection d'un jeu (grille 2 colonnes) — agnostique, pilotée par props.
import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { playerRange } from '../lib/games';
import { colors, contentMaxWidth, goldGradient, opacity, radius, spacing } from '../theme';

type Props = {
  emoji: string;
  /** Illustration du jeu ; prioritaire sur `emoji` si fournie. */
  image?: ImageSourcePropType;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  available: boolean;
  /** Libellé du badge (ex. « En cours »). Affiché seulement si `available`. */
  badgeLabel?: string;
  onPress: () => void;
};

export default function GameCard({
  emoji,
  image,
  name,
  minPlayers,
  maxPlayers,
  available,
  badgeLabel,
  onPress,
}: Props) {
  // Grille 2 colonnes avec padding xl (écran) + gap md (entre tuiles) —
  // cf. GamesScreen. On calcule la taille de tuile en pixels pour dimensionner
  // l'image en dur : <Image> retombe sur sa taille intrinsèque si son cadre
  // n'est pas résolu en pixels (% + aspectRatio sur une Image ne suffit pas).
  // useWindowDimensions (plutôt que Dimensions.get au chargement du module)
  // pour rester correct après rotation/redimensionnement.
  const { width: screenWidth } = useWindowDimensions();
  const availableWidth = Math.min(screenWidth, contentMaxWidth);
  const tileSize = (availableWidth - spacing.xl * 2 - spacing.md) / 2;
  const imageFrameWidth = tileSize * 0.76;
  const imageFrameHeight = tileSize * 0.58;

  const tileSizeStyle = { width: tileSize, height: tileSize };

  if (!available) {
    return (
      <View style={[styles.tile, tileSizeStyle]}>
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
      style={({ pressed }) => [styles.tile, tileSizeStyle, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {image && (
        <Image
          source={image}
          style={[
            styles.image,
            {
              top: tileSize * 0.12,
              left: tileSize * 0.12,
              width: imageFrameWidth,
              height: imageFrameHeight,
            },
          ]}
          resizeMode="contain"
        />
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
        <Text style={styles.players} numberOfLines={1}>
          {playerRange({ minPlayers, maxPlayers })} joueurs
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgAlt,
  },
  image: {
    position: 'absolute',
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
  players: { color: colors.gold, fontSize: 10, fontWeight: '700', marginTop: 2 },
});
