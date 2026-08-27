// Palmarès de fin de partie : titres décernés à partir des manches validées.
// Fonctions pures, sans dépendance store/React (comme scoring.ts) — le palmarès
// se recalcule donc tout seul après une correction de score depuis le tableau.
//
// Limite assumée : `RoundEntry.bonus` est un net par manche, impossible de
// séparer un +20 et un -5 saisis sur la même manche. « Le Chasseur de trésor »
// additionne donc les manches à bonus positif, « Le Maudit » celles à bonus
// négatif — et seulement celles qui ont effectivement rapporté (cf. Rascal
// ci-dessous), pour ne pas afficher des points que le tableau des scores ne
// montre nulle part.
import { bidKindOf, rascalOutcome } from './scoring';
import { Game } from './types';

/** Agrégats d'un joueur sur toute la partie (manches validées et complètes). */
export type PlayerStats = {
  playerId: string;
  /** Nombre de manches prises en compte. */
  roundsPlayed: number;
  /** Total des plis remportés. */
  tricks: number;
  /** Manches terminées sans le moindre pli. */
  emptyRounds: number;
  /** Mises tombées juste. */
  exactBids: number;
  /** Mises ratées d'un seul pli (les « presque »). */
  nearMisses: number;
  /** Total des bonus, sur les manches à bonus positif. */
  bonusGained: number;
  /** Total des malus, compté positivement, sur les manches à bonus négatif. */
  malusTaken: number;
};

/** Agrège la partie joueur par joueur. Une manche non validée ne compte pas. */
export function playerStats(game: Game): PlayerStats[] {
  return game.players.map((player) => {
    const stats: PlayerStats = {
      playerId: player.id,
      roundsPlayed: 0,
      tricks: 0,
      emptyRounds: 0,
      exactBids: 0,
      nearMisses: 0,
      bonusGained: 0,
      malusTaken: 0,
    };

    for (let round = 1; round <= game.cardsPerRound.length; round++) {
      const entry = game.rounds[round]?.[player.id];
      if (!entry?.validated || entry.bid == null || entry.tricks == null)
        continue;

      const { bid, tricks } = entry;
      const bonus = entry.bonus ?? 0;
      // En Rascal, un échec cuisant met la manche à zéro, bonus compris : le
      // joueur n'a rien glané, il ne mérite ni trésor ni malédiction pour ça.
      // En système classique, les bonus sont toujours acquis (§5).
      const bonusScored =
        game.scoreSystem !== 'rascal' ||
        rascalOutcome(bid, tricks, bidKindOf(entry)) !== 'miss';

      stats.roundsPlayed += 1;
      stats.tricks += tricks;
      if (tricks === 0) stats.emptyRounds += 1;
      if (tricks === bid) stats.exactBids += 1;
      else if (Math.abs(tricks - bid) === 1) stats.nearMisses += 1;
      if (bonusScored && bonus > 0) stats.bonusGained += bonus;
      if (bonusScored && bonus < 0) stats.malusTaken += -bonus;
    }

    return stats;
  });
}

export type AwardKey =
  | 'loup-de-mer'
  | 'marin-eau-douce'
  | 'parieur-fou'
  | 'presque'
  | 'chasseur-tresor'
  | 'maudit'
  | 'fantome';

/** Tonalité d'affichage du titre (filet gauche paille/grenat/creme, charte §06). */
export type AwardTone = 'good' | 'bad' | 'neutral';

/** Un titre décerné en fin de partie. */
export type Award = {
  key: AwardKey;
  emoji: string;
  title: string;
  tone: AwardTone;
  /** Le ou les lauréats — plusieurs en cas d'ex æquo. */
  playerIds: string[];
  /** Le chiffre qui justifie le titre, déjà mis en forme. */
  detail: string;
};

/** Accord au pluriel (0 et 1 restent au singulier en français). */
const plur = (n: number): string => (n > 1 ? 's' : '');

type AwardDef = {
  key: AwardKey;
  emoji: string;
  title: string;
  tone: AwardTone;
  /** Valeur classante du titre. */
  value: (s: PlayerStats) => number;
  /** Par défaut on décerne au maximum ; 'min' décerne au minimum. */
  mode?: 'min';
  /**
   * Valeur minimale pour que le titre veuille dire quelque chose (mode max
   * uniquement) : personne n'est « Le Maudit » sans le moindre malus.
   */
  threshold?: number;
  detail: (s: PlayerStats) => string;
};

const AWARD_DEFS: AwardDef[] = [
  {
    key: 'loup-de-mer',
    emoji: '🐺',
    title: 'Le Loup de mer',
    tone: 'good',
    value: (s) => s.tricks,
    detail: (s) => `${s.tricks} pli${plur(s.tricks)} remporté${plur(s.tricks)}`,
  },
  {
    key: 'marin-eau-douce',
    emoji: '🦆',
    title: "Le Marin d'eau douce",
    tone: 'neutral',
    value: (s) => s.tricks,
    mode: 'min',
    detail: (s) =>
      s.tricks === 0
        ? 'pas le moindre pli de toute la partie'
        : `${s.tricks} pli${plur(s.tricks)} remporté${plur(s.tricks)} en tout`,
  },
  {
    key: 'parieur-fou',
    emoji: '🎯',
    title: 'Le Parieur fou',
    tone: 'good',
    value: (s) => s.exactBids,
    detail: (s) =>
      `${s.exactBids} mise${plur(s.exactBids)} exacte${plur(s.exactBids)} sur ${s.roundsPlayed}`,
  },
  {
    key: 'presque',
    emoji: '😬',
    title: 'Le Presque',
    tone: 'neutral',
    value: (s) => s.nearMisses,
    detail: (s) =>
      `${s.nearMisses} manche${plur(s.nearMisses)} ratée${plur(s.nearMisses)} à un pli près`,
  },
  {
    key: 'chasseur-tresor',
    emoji: '💰',
    title: 'Le Chasseur de trésor',
    tone: 'good',
    value: (s) => s.bonusGained,
    detail: (s) => `+${s.bonusGained} pts de bonus`,
  },
  {
    key: 'maudit',
    emoji: '☠️',
    title: 'Le Maudit',
    tone: 'bad',
    value: (s) => s.malusTaken,
    detail: (s) => `-${s.malusTaken} pts de malus`,
  },
  {
    key: 'fantome',
    emoji: '👻',
    title: 'Le Fantôme',
    tone: 'neutral',
    value: (s) => s.emptyRounds,
    detail: (s) =>
      `${s.emptyRounds} manche${plur(s.emptyRounds)} sans le moindre pli`,
  },
];

/**
 * Décerne un titre, ou rien du tout : un titre que tout le monde mérite à
 * égalité ne distingue personne, et un titre à zéro (aucun malus, aucune mise
 * exacte…) n'a rien de drôle.
 */
function resolveAward(def: AwardDef, stats: PlayerStats[]): Award | null {
  if (stats.length === 0) return null;

  const values = stats.map(def.value);
  const best = def.mode === 'min' ? Math.min(...values) : Math.max(...values);
  if (def.mode !== 'min' && best < (def.threshold ?? 1)) return null;

  const winners = stats.filter((s) => def.value(s) === best);
  if (winners.length === stats.length) return null;

  return {
    key: def.key,
    emoji: def.emoji,
    title: def.title,
    tone: def.tone,
    playerIds: winners.map((w) => w.playerId),
    detail: def.detail(winners[0]),
  };
}

/** Le palmarès de la partie, dans l'ordre d'affichage. Peut être vide. */
export function awards(game: Game): Award[] {
  const stats = playerStats(game);
  return AWARD_DEFS.map((def) => resolveAward(def, stats)).filter(
    (award): award is Award => award !== null,
  );
}

/**
 * Les titres qu'aucun joueur ne mérite plus qu'un autre (tout le monde à
 * égalité, ou personne ne dépasse le seuil) — affichés en creux sous le
 * palmarès (maquette 9c : « Le Presque et Le Chasseur de trésor n'ont pas été
 * décernés : personne ne s'est détaché. »).
 */
export function unawardedTitles(
  game: Game,
): { key: AwardKey; title: string }[] {
  const stats = playerStats(game);
  return AWARD_DEFS.filter((def) => resolveAward(def, stats) === null).map(
    (def) => ({ key: def.key, title: def.title }),
  );
}
