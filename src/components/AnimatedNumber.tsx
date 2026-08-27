// Total qui compte jusqu'à sa nouvelle valeur (charte §07 : validation de
// manche, 950 ms, sortie cubique, aucun rebond). Respecte le mouvement
// réduit — saute directement à la valeur finale.
import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle, Animated } from 'react-native';
import { useReducedMotion } from '../lib/reducedMotion';
import { formatSignedScore } from '../lib/format';

type Props = {
  value: number;
  style?: StyleProp<TextStyle>;
  /** Affiche le signe (+12/-8) plutôt que la valeur brute — cf. formatSignedScore. */
  signed?: boolean;
  duration?: number;
};

export default function AnimatedNumber({
  value,
  style,
  signed,
  duration = 950,
}: Props) {
  const reducedMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;

    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: (t) => 1 - Math.pow(1 - t, 3), // sortie cubique, sans rebond
      useNativeDriver: false,
    }).start(() => anim.removeListener(id));

    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion]);

  return (
    <Text style={style}>{signed ? formatSignedScore(display) : display}</Text>
  );
}
