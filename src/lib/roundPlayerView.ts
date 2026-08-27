// Dérivations communes aux vues de saisie manche « un joueur à la fois »
// (mises, plis + bonus, correction) : cartes distribuées, entrée du joueur
// affiché (avec repli neutre si pas encore saisie), position dans la liste, et
// les deux booléens d'affichage dérivés du système de score / de l'option
// boulet de canon (potentiel Rascal, type de mise). Fonction de dérivation
// pure — pas de state/effect React, donc pas nommée comme un hook malgré son
// usage en haut de composant.
import { cardsForRound } from './scoring';
import { Game, RoundEntry } from './types';

// Repli neutre pour un joueur pas encore saisi sur la manche — même forme que
// zeroEntry côté store (store.ts), recréé ici en lecture seule pour éviter un
// nouveau littéral (et donc une nouvelle référence) à chaque appel.
const EMPTY_ENTRY: RoundEntry = {
  bid: 0,
  tricks: 0,
  bonus: 0,
  validated: false,
};

export type RoundPlayerView = {
  cards: number;
  entry: RoundEntry;
  isLastPlayer: boolean;
  /** Rascal sans boulet de canon : le potentiel de points est affiché en méta. */
  showPotential: boolean;
  /** Option boulet de canon active : le type de mise est affiché/saisi. */
  showBidKind: boolean;
};

export function getRoundPlayerView(
  game: Game,
  round: number,
  playerIndex: number,
): RoundPlayerView {
  const cards = cardsForRound(game.cardsPerRound, round);
  const player = game.players[playerIndex];
  const entry = game.rounds[round]?.[player.id] ?? EMPTY_ENTRY;
  const isLastPlayer = playerIndex === game.players.length - 1;
  const showPotential = game.scoreSystem === 'rascal' && !game.cannonballRule;
  const showBidKind = game.scoreSystem === 'rascal' && game.cannonballRule;

  return { cards, entry, isLastPlayer, showPotential, showBidKind };
}
