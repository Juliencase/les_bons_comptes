// Moteur de calcul — Belote classique (contrat fixe à 82).
// Référence : règles standard (pas de coinche). Total d'une manche = 162 points
// (152 + 10 de « dix de der »), saisis par l'utilisateur — l'app ne simule pas les plis.
import { BeloteGame, BeloteHandEntry, BeloteTeam } from './types';

export const HAND_TOTAL_POINTS = 162;
/** Le preneur doit strictement dépasser ce seuil pour tenir son contrat. */
export const CONTRACT_THRESHOLD = 81;
/** Points attribués à l'équipe qui remporte toutes les levées (capot). */
export const CAPOT_POINTS = 250;
export const BELOTE_REBELOTE_BONUS = 20;

/** Résout l'équipe adverse d'une équipe donnée. */
export function otherTeam(
  teams: [BeloteTeam, BeloteTeam],
  teamId: string,
): BeloteTeam {
  return teams[0].id === teamId ? teams[1] : teams[0];
}

/** True si la manche a de quoi être calculée (capot, ou points comptés saisis). */
export function isHandComplete(hand: BeloteHandEntry): boolean {
  return hand.capotTeamId != null || hand.teamAPoints != null;
}

/**
 * Points bruts comptés par une équipe donnée sur une manche (0..162), indépendant
 * de qui est preneur : propriété fixe de l'équipe, déduite de teamAPoints.
 * `null` tant que rien n'a été saisi.
 */
export function teamRawPoints(
  teams: [BeloteTeam, BeloteTeam],
  hand: BeloteHandEntry,
  teamId: string,
): number | null {
  if (hand.teamAPoints == null) return null;
  return teamId === teams[0].id
    ? hand.teamAPoints
    : HAND_TOTAL_POINTS - hand.teamAPoints;
}

/** True si le contrat du preneur est tenu (hors capot, qui suit sa propre règle). */
export function isContractHeld(
  teams: [BeloteTeam, BeloteTeam],
  hand: BeloteHandEntry,
): boolean {
  const takerPoints = teamRawPoints(teams, hand, hand.takerTeamId);
  return takerPoints != null && takerPoints > CONTRACT_THRESHOLD;
}

/**
 * Score d'une manche réparti par équipe (Belote-Rebelote incluse).
 * Suppose une manche complète (cf. isHandComplete) — les points non saisis sont
 * traités comme 0 par sécurité, mais l'UI empêche de valider une manche incomplète.
 */
export function handTeamScores(
  teams: [BeloteTeam, BeloteTeam],
  hand: BeloteHandEntry,
): Record<string, number> {
  const otherTeamId = otherTeam(teams, hand.takerTeamId).id;
  const scores: Record<string, number> = {};

  if (hand.capotTeamId != null) {
    // Capot : 250 à l'équipe qui a fait toutes les levées, 0 à l'autre.
    scores[hand.takerTeamId] =
      hand.capotTeamId === hand.takerTeamId ? CAPOT_POINTS : 0;
    scores[otherTeamId] = hand.capotTeamId === otherTeamId ? CAPOT_POINTS : 0;
  } else if (isContractHeld(teams, hand)) {
    // Contrat tenu : chacun garde ses points réellement comptés.
    const takerPoints = teamRawPoints(teams, hand, hand.takerTeamId) ?? 0;
    scores[hand.takerTeamId] = takerPoints;
    scores[otherTeamId] = HAND_TOTAL_POINTS - takerPoints;
  } else {
    // Chute (ou pas encore saisie) : les 162 points vont entièrement à l'adversaire.
    scores[hand.takerTeamId] = 0;
    scores[otherTeamId] = HAND_TOTAL_POINTS;
  }

  if (hand.beloteRebeloteTeamId != null) {
    scores[hand.beloteRebeloteTeamId] += BELOTE_REBELOTE_BONUS;
  }
  return scores;
}

/** Totaux cumulés de chaque équipe sur les manches validées. */
export function cumulativeTeamTotals(game: BeloteGame): Record<string, number> {
  const totals: Record<string, number> = {
    [game.teams[0].id]: 0,
    [game.teams[1].id]: 0,
  };
  for (const key of Object.keys(game.hands)) {
    const hand = game.hands[Number(key)];
    if (!hand?.validated) continue;
    const handScores = handTeamScores(game.teams, hand);
    for (const teamId of Object.keys(handScores)) {
      totals[teamId] += handScores[teamId];
    }
  }
  return totals;
}

/**
 * Équipe ayant atteint le score cible, si la partie est terminée.
 * Si les deux équipes franchissent le seuil sur la même manche, celle avec
 * le total le plus élevé l'emporte (pas simplement la première du tableau).
 */
export function winningTeamId(game: BeloteGame): string | null {
  const totals = cumulativeTeamTotals(game);
  const eligible = game.teams.filter((t) => totals[t.id] >= game.targetScore);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, t) =>
    totals[t.id] > totals[best.id] ? t : best,
  ).id;
}

/** Nom d'affichage d'une équipe : ses deux joueurs séparés par « & ». */
export function teamName(team: BeloteTeam): string {
  return team.players.join(' & ');
}

/**
 * Écart au score cible pour une équipe (jamais négatif : 0 si elle l'a déjà
 * atteint ou dépassé). Sert à l'indication « 274 pts avant l'objectif »
 * (maquette 10b).
 */
export function pointsToTarget(game: BeloteGame, teamId: string): number {
  const totals = cumulativeTeamTotals(game);
  return Math.max(0, game.targetScore - totals[teamId]);
}
