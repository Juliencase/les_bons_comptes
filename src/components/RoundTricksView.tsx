// Phase 3 d'une manche fraîche : plis remportés et bonus, un joueur à la fois.
// La mise (et son éventuel type) a déjà été saisie en phase 1 (RoundBidsView)
// et n'est ici qu'un rappel en lecture seule, non modifiable.
import React from 'react';
import BidKindField from './BidKindField';
import BidStepper from './BidStepper';
import BonusButtons from './BonusButtons';
import Callout from './Callout';
import RoundField from './RoundField';
import RoundPlayerFrame from './RoundPlayerFrame';
import RoundScoreReadout from './RoundScoreReadout';
import Stepper from './Stepper';
import {
  bidKindOf,
  isEntryComplete,
  roundLabel,
  roundMetaLabel,
  roundTotal,
  tricksEnteredForRound,
  tricksMismatchMessage,
} from '../lib/scoring';
import { getRoundPlayerView } from '../lib/roundPlayerView';
import { Game } from '../lib/types';
import { colors } from '../theme';

type Props = {
  game: Game;
  round: number;
  playerIndex: number;
  onSelectPlayer: (index: number) => void;
  backLabel: string;
  onBack: () => void;
  onOpenScoreboard: () => void;
  onChangeTricks: (value: number) => void;
  onChangeBonus: (value: number) => void;
  onNext: () => void;
};

export default function RoundTricksView({
  game,
  round,
  playerIndex,
  onSelectPlayer,
  backLabel,
  onBack,
  onOpenScoreboard,
  onChangeTricks,
  onChangeBonus,
  onNext,
}: Props) {
  const { cards, entry, isLastPlayer, showPotential, showBidKind } =
    getRoundPlayerView(game, round, playerIndex);
  const player = game.players[playerIndex];
  const complete = isEntryComplete(entry);
  const roundScore = complete
    ? roundTotal(entry, cards, game.scoreSystem)
    : null;

  const tricksSum = tricksEnteredForRound(game, round);
  const tricksMismatch = tricksMismatchMessage(tricksSum, cards);

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
      footerLabel={isLastPlayer ? 'Valider la manche' : 'Joueur suivant →'}
      onFooterPress={onNext}
      footerDisabled={!complete}
    >
      <BidStepper readOnly cards={cards} value={entry.bid} />

      {showBidKind && <BidKindField readOnly bidKind={bidKindOf(entry)} />}

      <RoundField label="Plis remportés" max={cards}>
        <Stepper
          value={entry.tricks}
          min={0}
          max={cards}
          onChange={onChangeTricks}
          accent={colors.paille}
          decrementLabel="Diminuer les plis"
          incrementLabel="Augmenter les plis"
        />
      </RoundField>

      <RoundField label="Bonus & malus">
        <BonusButtons value={entry.bonus ?? 0} onChange={onChangeBonus} />
      </RoundField>

      {tricksMismatch && <Callout>{tricksMismatch}</Callout>}

      <RoundScoreReadout score={roundScore} />
    </RoundPlayerFrame>
  );
}
