// Phase 1 d'une manche fraîche : saisie des mises, un joueur à la fois — pas
// encore de plis ni de bonus. RoundScreen bascule ensuite vers le rappel du
// classement (RoundRecapView), puis la phase plis/bonus (RoundTricksView).
import React from 'react';
import BidKindField from './BidKindField';
import BidStepper from './BidStepper';
import RoundPlayerFrame from './RoundPlayerFrame';
import { bidKindOf, roundLabel, roundMetaLabel } from '../lib/scoring';
import { getRoundPlayerView } from '../lib/roundPlayerView';
import { BidKind, Game } from '../lib/types';

type Props = {
  game: Game;
  round: number;
  playerIndex: number;
  onSelectPlayer: (index: number) => void;
  backLabel: string;
  onBack: () => void;
  onOpenScoreboard: () => void;
  onChangeBid: (value: number) => void;
  onChangeBidKind: (kind: BidKind) => void;
  onNext: () => void;
};

export default function RoundBidsView({
  game,
  round,
  playerIndex,
  onSelectPlayer,
  backLabel,
  onBack,
  onOpenScoreboard,
  onChangeBid,
  onChangeBidKind,
  onNext,
}: Props) {
  const { cards, entry, isLastPlayer, showPotential, showBidKind } =
    getRoundPlayerView(game, round, playerIndex);
  const player = game.players[playerIndex];
  const bidKind = bidKindOf(entry);

  return (
    <RoundPlayerFrame
      backLabel={backLabel}
      onBack={onBack}
      onOpenScoreboard={onOpenScoreboard}
      title={roundLabel(round)}
      meta={roundMetaLabel(cards, showPotential)}
      playerIndex={playerIndex}
      playersCount={game.players.length}
      onSelectPlayer={onSelectPlayer}
      playerName={player.name}
      footerLabel={isLastPlayer ? 'Voir le classement →' : 'Joueur suivant →'}
      onFooterPress={onNext}
    >
      <BidStepper cards={cards} value={entry.bid} onChange={onChangeBid} />

      {showBidKind && (
        <BidKindField bidKind={bidKind} onChange={onChangeBidKind} />
      )}
    </RoundPlayerFrame>
  );
}
