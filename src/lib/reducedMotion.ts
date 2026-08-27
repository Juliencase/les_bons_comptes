// Détection de la préférence « mouvement réduit » (charte §07) : supprime
// glissements et comptages, jamais les couleurs. Un seul hook, utilisé par
// les quelques composants animés (AnimatedNumber, RankingList, AwardList,
// WinnerCard).
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  return reduced;
}
