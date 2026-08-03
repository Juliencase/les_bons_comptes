// Types du domaine Skull King (v1 : système classique, format standard)

export type Screen = 'games' | 'home' | 'setup' | 'round' | 'scoreboard';

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
  players: Player[];
  totalRounds: number; // 10 en v1
  currentRound: number; // 1..totalRounds
  // rounds[roundNumber][playerId] = RoundEntry
  rounds: Record<number, Record<string, RoundEntry>>;
  createdAt: number;
  finishedAt?: number;
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const DEFAULT_TOTAL_ROUNDS = 10;
