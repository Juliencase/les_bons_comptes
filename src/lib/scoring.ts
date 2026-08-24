// Moteur de calcul Skull King — systèmes « Skull King » (classique) et « Rascal ».
// Référence : docs/REGLES_SKULL_KING.md §4.A et §4.B.
import { BidKind, Game, RoundEntry, ScoreSystem } from './types';

/**
 * Nombre de cartes distribuées à une manche donnée, selon le format de la partie
 * (cf. Game.cardsPerRound et lib/formats.ts).
 */
export const cardsForRound = (cardsPerRound: number[], round: number): number =>
  cardsPerRound[round - 1] ?? 0;

/** Type de mise par défaut : la règle Rascal de base, sans boulet de canon. */
export const DEFAULT_BID_KIND: BidKind = 'chevrotine';

/**
 * Type de mise effectif d'une entrée. Les parties créées avant l'option Rascal
 * (et toutes celles en système classique) n'en portent pas → chevrotine.
 */
export function bidKindOf(entry: RoundEntry): BidKind {
  return entry.bidKind ?? DEFAULT_BID_KIND;
}

// --- Système classique (§4.A) ------------------------------------------------

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

// --- Système Rascal (§4.B) ---------------------------------------------------

/**
 * Précision d'une mise dans le système Rascal :
 * - 'direct' : coup direct (écart 0) → 100 % des points en jeu ;
 * - 'graze'  : frappe à revers (écart 1, chevrotine seulement) → 50 % ;
 * - 'miss'   : échec cuisant → 0 point.
 */
export type RascalOutcome = 'direct' | 'graze' | 'miss';

export function rascalOutcome(
  bid: number,
  tricks: number,
  bidKind: BidKind,
): RascalOutcome {
  const gap = Math.abs(tricks - bid);
  if (gap === 0) return 'direct';
  // Boulet de canon : tout ou rien, pas de demi-points.
  if (gap === 1 && bidKind === 'chevrotine') return 'graze';
  return 'miss';
}

/** Points en jeu sur la manche (hors bonus) : 10 × cartes, ou 15 × cartes en boulet. */
export function rascalPotential(cards: number, bidKind: BidKind): number {
  return (bidKind === 'boulet' ? 15 : 10) * cards;
}

/**
 * Score d'une manche en système Rascal, **bonus compris** : contrairement au
 * système classique, les bonus sont pondérés par la précision de la mise
 * (100 / 50 / 0 %) et ne sont donc pas additionnables après coup.
 * La frappe à revers arrondit au supérieur, en faveur du joueur (§4.B).
 */
export function rascalScore(
  bid: number,
  tricks: number,
  cards: number,
  bidKind: BidKind,
  bonus: number,
): number {
  switch (rascalOutcome(bid, tricks, bidKind)) {
    case 'direct':
      return rascalPotential(cards, bidKind) + bonus;
    case 'graze':
      return Math.ceil((rascalPotential(cards, 'chevrotine') + bonus) / 2);
    case 'miss':
      return 0;
  }
}

// --- Agrégations -------------------------------------------------------------

/** True si les deux champs de la manche sont saisis. */
export function isEntryComplete(entry: RoundEntry | undefined): boolean {
  return !!entry && entry.bid != null && entry.tricks != null;
}

/**
 * Score total d'une manche pour un joueur, selon le système de la partie.
 * Retourne 0 si la manche n'est pas encore saisie.
 */
export function roundTotal(
  entry: RoundEntry | undefined,
  cards: number,
  system: ScoreSystem,
): number {
  if (!entry || entry.bid == null || entry.tricks == null) return 0;
  const bonus = entry.bonus ?? 0;
  if (system === 'rascal') {
    return rascalScore(entry.bid, entry.tricks, cards, bidKindOf(entry), bonus);
  }
  return bidScore(entry.bid, entry.tricks, cards) + bonus;
}

/** Total cumulé d'un joueur sur toutes les manches validées. */
export function cumulativeTotal(game: Game, playerId: string): number {
  let sum = 0;
  for (let r = 1; r <= game.cardsPerRound.length; r++) {
    const entry = game.rounds[r]?.[playerId];
    if (entry?.validated && isEntryComplete(entry)) {
      sum += roundTotal(entry, cardsForRound(game.cardsPerRound, r), game.scoreSystem);
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
