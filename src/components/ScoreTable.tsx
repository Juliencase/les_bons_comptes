// Tableau récapitulatif Skull King : lignes = manches, colonnes = joueurs.
import React from 'react';
import ScoreGrid, { ScoreGridColumn, ScoreGridRow } from './ScoreGrid';
import { Text } from 'react-native';
import { colors } from '../theme';
import {
  cardsForRound,
  cumulativeTotals,
  isEntryComplete,
  roundTotal,
} from '../lib/scoring';
import { Game } from '../lib/types';

const CELL = 68;

type Props = {
  game: Game;
  /** Si fourni, chaque ligne de manche devient touchable pour la corriger (ex. après la fin de la partie). */
  onRoundPress?: (round: number) => void;
};

export default function ScoreTable({ game, onRoundPress }: Props) {
  const totals = cumulativeTotals(game);
  const rounds = Array.from(
    { length: game.cardsPerRound.length },
    (_, i) => i + 1,
  );

  const columns: ScoreGridColumn[] = game.players.map((p) => ({
    id: p.id,
    label: p.name,
  }));

  const rows: ScoreGridRow[] = rounds.map((r) => {
    // Le surlignage « manche en cours » n'a de sens que pendant une partie
    // active : après la fin, currentRound ne fait que suivre la dernière
    // manche ouverte pour correction, ce n'est plus « la » manche en cours.
    const isCurrent = !game.finishedAt && r === game.currentRound;
    const values: Record<string, number | null> = {};
    for (const p of game.players) {
      const entry = game.rounds[r]?.[p.id];
      const done = isEntryComplete(entry) && entry?.validated;
      values[p.id] = done
        ? roundTotal(
            entry,
            cardsForRound(game.cardsPerRound, r),
            game.scoreSystem,
          )
        : null;
    }
    return {
      key: r,
      isCurrent,
      values,
      labelExtra: (
        <Text
          style={{ color: colors.textDim, fontWeight: '400', fontSize: 12 }}
        >
          {'  '}({cardsForRound(game.cardsPerRound, r)} c.)
        </Text>
      ),
    };
  });

  return (
    <ScoreGrid
      columns={columns}
      rows={rows}
      totals={totals}
      cellWidth={CELL}
      onRowPress={onRoundPress}
    />
  );
}
