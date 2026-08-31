// Catalogue des jeux proposés sur l'écran d'accueil.
// Extensible : ajouter une entrée dans GAMES suffit pour proposer un nouveau jeu.
import { Screen } from './types';

export type GameDef = {
  key: string;
  name: string;
  /** Courte accroche affichée sous le nom (ex. « Plis & paris »). */
  tagline: string;
  duration?: number; // durée approximative du jeu en minutes
  minPlayers: number;
  maxPlayers: number;
  available: boolean;
  screen?: Screen; // écran d'accueil du jeu (si disponible)
};

/** Résout un jeu par sa clé. Lève une erreur si la clé est inconnue. */
export function getGame(key: string): GameDef {
  const g = GAMES.find((game) => game.key === key);
  if (!g) throw new Error(`Unknown game: ${key}`);
  return g;
}

/** Formatte l'effectif d'un jeu ("4" si min===max, sinon "2-8"). */
export function playerRange(
  g: Pick<GameDef, 'minPlayers' | 'maxPlayers'>,
): string {
  return g.minPlayers === g.maxPlayers
    ? `${g.minPlayers}`
    : `${g.minPlayers}-${g.maxPlayers}`;
}

export const GAMES: GameDef[] = [
  {
    key: 'skull-king',
    name: 'Skull King',
    tagline: 'Plis & paris',
    duration: 30,
    minPlayers: 2,
    maxPlayers: 8,
    available: true,
    screen: 'home',
  },
  {
    key: 'belote',
    name: 'Belote',
    tagline: 'Contrat à 82, sans coinche',
    duration: 45,
    minPlayers: 4,
    maxPlayers: 4,
    available: true,
    screen: 'belote-home',
  },
];
