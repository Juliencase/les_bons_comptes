// Moteur de calcul — système de score « Skull King » classique.
// Référence : docs/REGLES_SKULL_KING.md §4.A.
import { Game, RoundEntry } from './types';

/**
 * Nombre de cartes distribuées à une manche.
 * Format standard v1 : manche N = N cartes.
 * (Fonction dédiée pour faciliter les formats personnalisés plus tard.)
 */
export const cardsForRound = (round: number): number => round;

/**
 * Points de mise (hors bonus) pour un joueur sur une manche.
 * - mise 0 réussie      → +10 × cartes
 * - mise 0 ratée        → -10 × cartes
 * - mise ≥ 1 réussie    → +20 × mise
 * - mise ≥ 1 ratée      → -10 × écart (valeur absolue)
 */
export function bidScore(bid: number, tricks: number, cards: number): number {
  if (bid === 0) {
    return tricks === 0 ? 10 * cards : -10 * cards;
  }
  return tricks === bid ? 20 * bid : -10 * Math.abs(tricks - bid);
}

/** True si les deux champs de la manche sont saisis. */
export function isEntryComplete(entry: RoundEntry | undefined): boolean {
  return !!entry && entry.bid != null && entry.tricks != null;
}

/**
 * Score total d'une manche pour un joueur = points de mise + bonus.
 * Retourne 0 si la manche n'est pas encore saisie.
 */
export function roundTotal(entry: RoundEntry | undefined, cards: number): number {
  if (!entry || entry.bid == null || entry.tricks == null) return 0;
  return bidScore(entry.bid, entry.tricks, cards) + (entry.bonus ?? 0);
}

/** Total cumulé d'un joueur sur toutes les manches saisies. */
export function cumulativeTotal(game: Game, playerId: string): number {
  let sum = 0;
  for (let r = 1; r <= game.totalRounds; r++) {
    const entry = game.rounds[r]?.[playerId];
    if (isEntryComplete(entry)) {
      sum += roundTotal(entry, cardsForRound(r));
    }
  }
  return sum;
}

/** Totaux cumulés de tous les joueurs : { playerId: total }. */
export function cumulativeTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of game.players) {
    totals[p.id] = cumulativeTotal(game, p.id);
  }
  return totals;
}

/** Classement décroissant : [{ playerId, total, rank }]. Gère les ex æquo. */
export function ranking(
  game: Game,
): Array<{ playerId: string; total: number; rank: number }> {
  const totals = cumulativeTotals(game);
  const sorted = game.players
    .map((p) => ({ playerId: p.id, total: totals[p.id] }))
    .sort((a, b) => b.total - a.total);

  let rank = 0;
  let lastTotal: number | null = null;
  return sorted.map((row, index) => {
    if (lastTotal === null || row.total !== lastTotal) {
      rank = index + 1;
      lastTotal = row.total;
    }
    return { ...row, rank };
  });
}

/** Somme des plis remportés saisis sur une manche (pour l'avertissement de cohérence). */
export function tricksEnteredForRound(game: Game, round: number): number {
  const byPlayer = game.rounds[round] ?? {};
  return game.players.reduce((sum, p) => {
    const t = byPlayer[p.id]?.tricks;
    return sum + (t ?? 0);
  }, 0);
}
