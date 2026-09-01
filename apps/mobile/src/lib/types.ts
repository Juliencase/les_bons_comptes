// Types du domaine Skull King (systèmes classique + Rascal, formats configurables)

export type Screen =
  | 'games'
  | 'home'
  | 'setup'
  | 'round'
  | 'scoreboard'
  | 'belote-home'
  | 'belote-setup'
  | 'belote-round'
  | 'belote-scoreboard'
  | 'room';

export type Player = {
  id: string;
  name: string;
};

/**
 * Système de score de la partie, choisi à sa création — cf.
 * docs/REGLES_SKULL_KING.md §4 :
 * - 'skull-king' : le classique (+20/pli misé, -10/pli d'écart) ;
 * - 'rascal'     : le système équilibré (potentiel identique chaque manche,
 *                  gagné à 100 / 50 / 0 % selon la précision de la mise).
 */
export type ScoreSystem = 'skull-king' | 'rascal';

/**
 * Type de mise — option Rascal « Boulet de canon » (§4.B) :
 * - 'chevrotine' : règle Rascal habituelle (10 pts/carte, 100 / 50 / 0 %) ;
 * - 'boulet'     : tout ou rien (15 pts/carte si mise exacte, sinon 0).
 * Sans effet dans le système classique.
 */
export type BidKind = 'chevrotine' | 'boulet';

/** Saisie d'un joueur pour une manche donnée. */
export type RoundEntry = {
  bid: number | null; // mise annoncée (0..cartes) ; null tant que non saisie
  tricks: number | null; // plis remportés (0..cartes) ; null tant que non saisi
  bonus: number; // bonus libre (défaut 0, peut être négatif)
  // Option Rascal uniquement ; absent sur les parties d'avant l'option → chevrotine
  // (lire via bidKindOf() dans lib/scoring.ts plutôt que directement).
  bidKind?: BidKind;
  validated: boolean; // true une fois la manche validée et archivée
};

/** Paramètres choisis à la création d'une partie (cf. SetupScreen). */
export type GameSetup = {
  // Cartes distribuées à chaque manche (cf. FormatDef dans lib/formats.ts) ;
  // le nombre de manches = cardsPerRound.length.
  cardsPerRound: number[];
  scoreSystem: ScoreSystem;
  // Option Rascal : autorise la mise « Boulet de canon » (cf. BidKind).
  cannonballRule: boolean;
};

export type Game = GameSetup & {
  id: string;
  gameKey: string; // clé du jeu compté (cf. GameDef.key dans lib/games.ts)
  players: Player[];
  currentRound: number; // 1..cardsPerRound.length
  // rounds[roundNumber][playerId] = RoundEntry
  rounds: Record<number, Record<string, RoundEntry>>;
  createdAt: number;
  finishedAt?: number;
};
