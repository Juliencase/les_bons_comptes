// Tableau récapitulatif Belote : lignes = manches, colonnes = équipes. Les
// en-têtes reprennent la convention « Nous » (équipe 1) / « Eux » (équipe 2)
// de la charte (maquette 10b) plutôt que les noms de joueurs, trop longs pour
// une colonne — `teamName()` (noms des joueurs) reste utilisé ailleurs
// (vainqueur, cartes de total) où la place ne manque pas.
import React from 'react';
import ScoreGrid, { ScoreGridColumn, ScoreGridRow } from './ScoreGrid';
import { handTeamScores, isContractHeld } from '../lib/belote/scoring';
import { BeloteGame } from '../lib/belote/types';

const TEAM_LABELS = ['Nous', 'Eux'];

type Props = {
  game: BeloteGame;
  /** Si fourni, chaque ligne de manche devient touchable pour la corriger (ex. après la fin de la partie). */
  onHandPress?: (hand: number) => void;
};

export default function BeloteHandTable({ game, onHandPress }: Props) {
  const hands = Object.keys(game.hands)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((h) => game.hands[h].validated);

  const columns: ScoreGridColumn[] = game.teams.map((t, i) => ({
    id: t.id,
    label: TEAM_LABELS[i],
  }));

  const rows: ScoreGridRow[] = hands.map((h) => {
    const hand = game.hands[h];
    const isCurrent = !game.finishedAt && h === game.currentHand;
    const scores = handTeamScores(game.teams, hand);
    const takerIndex = game.teams.findIndex((t) => t.id === hand.takerTeamId);
    const takerLabel = TEAM_LABELS[takerIndex];

    const values: ScoreGridRow['values'] = {};
    const chute = hand.capotTeamId == null && !isContractHeld(game.teams, hand);
    for (const t of game.teams) {
      const value = scores[t.id];
      const tone =
        chute && t.id === hand.takerTeamId
          ? 'loss'
          : value > 0
            ? 'gain'
            : 'neutral';
      values[t.id] = { value, tone };
    }

    const outcome =
      hand.capotTeamId != null
        ? 'capot'
        : isContractHeld(game.teams, hand)
          ? 'tenu'
          : 'chute';
    // Le sujet du libellé est l'équipe du capot si applicable (celle qui l'a
    // réalisé), sinon la preneuse (contrat tenu ou chute).
    const subjectLabel =
      hand.capotTeamId != null
        ? TEAM_LABELS[game.teams.findIndex((t) => t.id === hand.capotTeamId)]
        : takerLabel;

    return {
      key: h,
      isCurrent,
      values,
      labelExtra: `${subjectLabel} · ${outcome}`,
    };
  });

  return <ScoreGrid columns={columns} rows={rows} onRowPress={onHandPress} />;
}
