// Segments d'avancement (une manche, ou un joueur au sein de la manche) —
// charte, maquettes 8b/9a. Tappable quand `onPressSegment` est fourni (9a :
// sauter directement à un joueur).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { alpha, colors } from '../theme';

export type SegmentState = 'done' | 'current' | 'upcoming';

type Props = {
  segments: SegmentState[];
  onPressSegment?: (index: number) => void;
  height?: number;
};

const COLOR: Record<SegmentState, string> = {
  done: colors.paille,
  current: colors.sanguine,
  upcoming: alpha.creme(0.16),
};

export default function SegmentBar({
  segments,
  onPressSegment,
  height = 4,
}: Props) {
  return (
    <View style={styles.row}>
      {segments.map((state, i) =>
        onPressSegment ? (
          <Pressable
            key={i}
            onPress={() => onPressSegment(i)}
            accessibilityRole="button"
            hitSlop={6}
            style={[styles.segment, { height, backgroundColor: COLOR[state] }]}
          />
        ) : (
          <View
            key={i}
            style={[styles.segment, { height, backgroundColor: COLOR[state] }]}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1 },
});
