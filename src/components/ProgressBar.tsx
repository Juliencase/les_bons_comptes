// Barre de progression fine (Belote : score d'une équipe vers l'objectif).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { alpha, colors } from '../theme';

type Props = {
  /** 0..1, tronqué. */
  progress: number;
  color?: string;
  height?: number;
};

export default function ProgressBar({
  progress,
  color = colors.paille,
  height = 6,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          { width: `${pct}%`, height, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: alpha.creme(0.16) },
  fill: {},
});
