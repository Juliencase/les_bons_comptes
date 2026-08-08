// Types du domaine Skull King (v1 : système classique, format standard)

export type Screen =
  | 'games'
  | 'home'
  | 'setup'
  | 'round'
  | 'scoreboard'
  | 'belote-home'
  | 'belote-setup'
  | 'belote-round'
  | 'belote-scoreboard';

export type Player = {
  id: string;
  name: string;
};

/** Saisie d'un joueur pour une manche donnée. */
export type RoundEntry = {
  bid: number | null; // mise annoncée (0..cartes) ; null tant que non saisie
  tricks: number | null; // plis remportés (0..cartes) ; null tant que non saisi
  bonus: number; // bonus libre (défaut 0, peut être négatif)
  validated: boolean; // true une fois la manche validée et archivée
};

export type Game = {
  id: string;
  gameKey: string; // clé du jeu compté (cf. GameDef.key dans lib/games.ts)
  players: Player[];
  // Cartes distribuées à chaque manche (cf. FormatDef dans lib/formats.ts) ;
  // le nombre de manches = cardsPerRound.length.
  cardsPerRound: number[];
  currentRound: number; // 1..cardsPerRound.length
  // rounds[roundNumber][playerId] = RoundEntry
  rounds: Record<number, Record<string, RoundEntry>>;
  createdAt: number;
  finishedAt?: number;
};
