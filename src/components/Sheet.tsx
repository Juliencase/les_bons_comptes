// Modale unique de l'app (charte §06/§09 : « une seule dans l'app ») — panneau
// bas, bord haut grenat 4 px, écran atténué. Pas de flou (RN n'a pas de
// filter: blur natif fiable multi-plateforme) : une simple atténuation suffit.
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';

type Props = {
  visible: boolean;
  kicker: string;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel: () => void;
};

export default function Sheet({
  visible,
  kicker,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Annuler',
  onCancel,
}: Props) {
  // Démonte plutôt que de basculer `visible` : react-native-web ne masque pas
  // toujours fiablement le contenu porté d'une Modal quand `visible` repasse
  // à false (le nœud reste dans le DOM) — le montage conditionnel est fiable
  // sur les trois plateformes.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="none"
      />
      <View style={styles.panel}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.confirm,
              pressed && styles.confirmPressed,
            ]}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cancel,
              pressed && styles.cancelPressed,
            ]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,26,20,0.72)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.fond,
    borderTopWidth: 4,
    borderTopColor: colors.grenat,
    padding: 22,
    paddingTop: 24,
    paddingBottom: 26,
  },
  kicker: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.grenat,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 38,
    lineHeight: Math.round(38 * 0.88),
    textTransform: 'uppercase',
    color: colors.creme,
    marginBottom: 12,
  },
  message: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 18,
    color: alpha.creme(0.68),
    marginBottom: 18,
  },
  actions: { gap: 8 },
  confirm: {
    backgroundColor: colors.grenat,
    padding: 17,
    alignItems: 'center',
  },
  confirmPressed: { backgroundColor: colors.grenatHover },
  confirmText: {
    fontFamily: fonts.displayBlack,
    fontSize: 24,
    letterSpacing: 24 * 0.05,
    textTransform: 'uppercase',
    color: colors.fond,
  },
  cancel: {
    borderWidth: 1,
    borderColor: alpha.creme(0.32),
    padding: 17,
    alignItems: 'center',
  },
  cancelPressed: { borderColor: colors.creme },
  cancelText: {
    fontFamily: fonts.displayBlack,
    fontSize: 24,
    letterSpacing: 24 * 0.05,
    textTransform: 'uppercase',
    color: colors.creme,
  },
});
