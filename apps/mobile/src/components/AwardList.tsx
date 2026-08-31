// Palmarès de fin de partie : un titre par ligne (titre, lauréat, chiffre qui
// le justifie). Présentational — les titres sont calculés dans lib/stats.ts,
// les noms de joueurs résolus par l'écran. Pas d'emoji (charte §09) : le filet
// gauche porte la tonalité (paille/grenat/creme) à la place. Fin de partie
// (§07) : les titres se posent en cascade, 280 ms chacun.
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts } from '../theme';
import { AwardTone } from '../lib/stats';
import { useReducedMotion } from '../lib/reducedMotion';

export type AwardRow = {
  id: string;
  title: string;
  tone: AwardTone;
  /** Lauréat(s), déjà mis en forme (« Alice », ou « Alice & Bob » si ex æquo). */
  names: string;
  detail: string;
};

const TONE_COLOR: Record<AwardTone, string> = {
  good: colors.paille,
  bad: colors.grenat,
  neutral: alpha.creme(0.35),
};

const CASCADE_STEP_MS = 90;
const CASCADE_DURATION_MS = 280;

export default function AwardList({ rows }: { rows: AwardRow[] }) {
  const reducedMotion = useReducedMotion();
  return (
    <View style={styles.list}>
      {rows.map((row, index) => (
        <CascadeRow key={row.id} index={index} reducedMotion={reducedMotion}>
          <View style={[styles.row, { borderLeftColor: TONE_COLOR[row.tone] }]}>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {row.title}
              </Text>
            </View>
            <View style={styles.result}>
              <Text style={styles.names} numberOfLines={1}>
                {row.names}
              </Text>
              <Text
                style={[styles.detail, { color: TONE_COLOR[row.tone] }]}
                numberOfLines={1}
              >
                {row.detail}
              </Text>
            </View>
          </View>
        </CascadeRow>
      ))}
    </View>
  );
}

function CascadeRow({
  index,
  reducedMotion,
  children,
}: {
  index: number;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: CASCADE_DURATION_MS,
      delay: index * CASCADE_STEP_MS,
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
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 5 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
    borderWidth: 1,
    borderColor: alpha.creme(0.2),
    borderLeftWidth: 4,
    padding: 13,
  },
  body: { flexShrink: 1 },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 25,
    lineHeight: 25,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  result: { alignItems: 'flex-end' },
  names: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    lineHeight: 20,
    textTransform: 'uppercase',
    color: colors.creme,
    marginBottom: 5,
  },
  detail: { fontFamily: fonts.mono, fontSize: 9 },
});
