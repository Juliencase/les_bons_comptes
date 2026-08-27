// Tableau récapitulatif Skull King : lignes = manches, colonnes = joueurs.
import React from 'react';
import ScoreGrid, { ScoreGridColumn, ScoreGridRow } from './ScoreGrid';
import { cardsForRound, isEntryComplete, roundTotal } from '../lib/scoring';
import { Game } from '../lib/types';

type Props = {
  game: Game;
  /** Si fourni, chaque ligne de manche devient touchable pour la corriger (ex. après la fin de la partie). */
  onRoundPress?: (round: number) => void;
};

export default function ScoreTable({ game, onRoundPress }: Props) {
  const rounds = Array.from(
    { length: game.cardsPerRound.length },
    (_, i) => i + 1,
  );

  const columns: ScoreGridColumn[] = game.players.map((p) => ({
    id: p.id,
    label: p.name.slice(0, 3),
  }));

  const rows: ScoreGridRow[] = rounds.map((r) => {
    // Le surlignage « manche en cours » n'a de sens que pendant une partie
    // active : après la fin, currentRound ne fait que suivre la dernière
    // manche ouverte pour correction, ce n'est plus « la » manche en cours.
    const isCurrent = !game.finishedAt && r === game.currentRound;
    const cards = cardsForRound(game.cardsPerRound, r);
    const values: ScoreGridRow['values'] = {};
    for (const p of game.players) {
      const entry = game.rounds[r]?.[p.id];
      const done = isEntryComplete(entry) && entry?.validated;
      if (!done) {
        values[p.id] = null;
        continue;
      }
      const value = roundTotal(entry, cards, game.scoreSystem);
      values[p.id] = { value, tone: value > 0 ? 'gain' : 'loss' };
    }
    return {
      key: r,
      isCurrent,
      values,
      labelExtra: `${cards} carte${cards > 1 ? 's' : ''}`,
    };
  });

  return <ScoreGrid columns={columns} rows={rows} onRowPress={onRoundPress} />;
}
