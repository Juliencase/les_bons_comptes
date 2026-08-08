// Écran d'accueil générique : image du jeu, titre, effectif/durée, actions
// (nouvelle partie / reprendre / tableau des scores) et footer. Store/navigation-agnostic —
// HomeScreen (Skull King) et BeloteHomeScreen (Belote) lui passent leurs données et callbacks.
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from './BackButton';
import Button from './Button';
import ScreenHeader from './ScreenHeader';
import { colors, fonts, spacing } from '../theme';

type Props = {
  image: ImageSourcePropType;
  /** hauteur / largeur intrinsèque de l'image, pour calculer IMAGE_HEIGHT sans déformation. */
  imageRatio: number;
  title: string;
  playerRangeText: string;
  durationMin?: number;
  footer: string;
  onBack: () => void;
  onNewGame: () => void;
  resumeLabel?: string;
  onResume?: () => void;
  showScoreboard?: boolean;
  scoreboardLabel: string;
  onScoreboard: () => void;
};

export default function GameHomeScreen({
  image,
  imageRatio,
  title,
  playerRangeText,
  durationMin,
  footer,
  onBack,
  onNewGame,
  resumeLabel,
  onResume,
  showScoreboard,
  scoreboardLabel,
  onScoreboard,
}: Props) {
  // On force des dimensions numériques (pas de %/aspectRatio) car <Image>
  // retombe sur sa taille intrinsèque si le style ne lui donne pas des
  // width/height résolus en pixels. useWindowDimensions (plutôt que
  // Dimensions.get à l'import) fait que ça se recalcule à la rotation/resize.
  const windowWidth = useWindowDimensions().width;
  const imageWidth = Math.min(windowWidth - spacing.xl * 2, 260);
  const imageHeight = Math.round(imageWidth * imageRatio);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader left={<BackButton label="Jeux" onPress={onBack} />} />

      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={image}
            style={[styles.gameImage, { width: imageWidth, height: imageHeight }]}
            resizeMode="contain"
          />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>{playerRangeText}</Text>
            </View>
            {durationMin != null && (
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>⏱️</Text>
                <Text style={styles.infoText}>{durationMin} min</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Nouvelle partie" onPress={onNewGame} />

          {resumeLabel != null && onResume != null && (
            <Button variant="secondary" label={resumeLabel} onPress={onResume} />
          )}

          {showScoreboard && (
            <Button variant="ghost" label={scoreboardLabel} onPress={onScoreboard} />
          )}
        </View>

        <Text style={styles.footer}>{footer}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: spacing.xxl },
  gameImage: {},
  title: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 30,
    marginTop: spacing.lg,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoIcon: { fontSize: 15 },
  infoText: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  actions: { gap: spacing.md },
  footer: {
    color: colors.textDim,
    textAlign: 'center',
    fontSize: 13,
  },
});
