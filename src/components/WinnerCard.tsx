// Encart mettant en avant le vainqueur d'une partie terminée (charte, maquette
// 9c). Fin de partie (§07) : s'imprime en 600 ms, sans rebond.
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import AnimatedNumber from './AnimatedNumber';
import { alpha, colors, fonts } from '../theme';
import { useReducedMotion } from '../lib/reducedMotion';

type Props = {
  label: string;
  name: string;
  score: number;
  /** Ligne de détail optionnelle (ex. « +135 sur Mathilde · 26 plis remportés »). */
  detail?: string;
};

export default function WinnerCard({ label, name, score, detail }: Props) {
  const reducedMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.96, 1],
            }),
          },
        ],
      }}
    >
      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <AnimatedNumber value={score} style={styles.score} duration={600} />
        </View>
        {detail != null && <Text style={styles.detail}>{detail}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.sanguine, padding: 18 },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.sanguine,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.displayBlack,
    fontSize: 52,
    lineHeight: Math.round(52 * 0.86),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  score: {
    fontFamily: fonts.displayBlack,
    fontSize: 46,
    lineHeight: 46,
    color: colors.paille,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.55),
    marginTop: 10,
  },
});
