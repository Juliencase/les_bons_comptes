// Tableau récapitulatif Belote : lignes = manches, colonnes = équipes.
import React from 'react';
import { Text } from 'react-native';
import ScoreGrid, { ScoreGridColumn, ScoreGridRow } from './ScoreGrid';
import { colors } from '../theme';
import {
  cumulativeTeamTotals,
  handTeamScores,
  teamName,
} from '../lib/belote/scoring';
import { BeloteGame } from '../lib/belote/types';

const CELL = 96;

type Props = {
  game: BeloteGame;
  /** Si fourni, chaque ligne de manche devient touchable pour la corriger (ex. après la fin de la partie). */
  onHandPress?: (hand: number) => void;
};

export default function BeloteHandTable({ game, onHandPress }: Props) {
  const totals = cumulativeTeamTotals(game);
  const hands = Object.keys(game.hands)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((h) => game.hands[h].validated);

  const columns: ScoreGridColumn[] = game.teams.map((t) => ({
    id: t.id,
    label: teamName(t),
  }));

  const rows: ScoreGridRow[] = hands.map((h) => {
    const hand = game.hands[h];
    const isCurrent = !game.finishedAt && h === game.currentHand;
    const scores = handTeamScores(game.teams, hand);
    const takerName = teamName(
      game.teams.find((t) => t.id === hand.takerTeamId)!,
    );
    return {
      key: h,
      isCurrent,
      values: scores,
      labelExtra: (
        <Text
          style={{ color: colors.textDim, fontWeight: '400', fontSize: 11 }}
          numberOfLines={1}
        >
          {'  '}({takerName}
          {hand.capotTeamId != null ? ' · capot' : ''})
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
      onRowPress={onHandPress}
    />
  );
}
