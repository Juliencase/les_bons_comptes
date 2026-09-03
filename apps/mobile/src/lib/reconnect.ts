// Backoff exponentiel plafonné pour les tentatives de reconnexion du socket
// multijoueur (voir useRoomSocket dans ws.ts) : une coupure inattendue après
// un état `connected` programme un nouvel essai, avec un délai qui double à
// chaque échec jusqu'à un plafond, plus un peu de jitter pour éviter que
// plusieurs clients coupés en même temps ne retentent tous à la même
// seconde. Fonction pure, testable indépendamment du hook (pas de
// @testing-library/react-native dans ce repo — voir CLAUDE.md).
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;
const JITTER_RATIO = 0.2;

/** Délai avant le (attempt + 1)-ième essai — attempt commence à 0. */
export function computeBackoffDelayMs(attempt: number): number {
  const capped = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return capped + capped * JITTER_RATIO * Math.random();
}
