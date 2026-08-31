// Vue combinée « mise + plis + bonus » pour une manche déjà validée :
// correction en cours de partie (bouton fantôme « Manche précédente ») ou
// après la fin de la partie (tableau des scores). Reprend à l'identique le
// comportement de l'ancien écran de saisie unique — seule une manche fraîche
// (RoundScreen) suit désormais le flux en 3 phases (mises → classement → plis
// et bonus).
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
import { BidKind, Game } from '../lib/types';
import { colors } from '../theme';

type Props = {
  game: Game;
  round: number;
  playerIndex: number;
  onSelectPlayer: (index: number) => void;
  /** Avance au joueur suivant ou valide la manche — ignoré en mode post-partie. */
  onNext: () => void;
  backLabel: string;
  onBack: () => void;
  onOpenScoreboard: () => void;
  onChangeBid: (value: number) => void;
  onChangeTricks: (value: number) => void;
  onChangeBonus: (value: number) => void;
  onChangeBidKind: (kind: BidKind) => void;
};

export default function RoundCorrectionView({
  game,
  round,
  playerIndex,
  onSelectPlayer,
  onNext,
  backLabel,
  onBack,
  onOpenScoreboard,
  onChangeBid,
  onChangeTricks,
  onChangeBonus,
  onChangeBidKind,
}: Props) {
  const editMode = !!game.finishedAt;
  const { cards, entry, isLastPlayer, showPotential, showBidKind } =
    getRoundPlayerView(game, round, playerIndex);
  const player = game.players[playerIndex];
  const complete = isEntryComplete(entry);
  const bidKind = bidKindOf(entry);
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
      title={editMode ? `Modifier la manche ${round}` : roundLabel(round)}
      meta={roundMetaLabel(cards, showPotential)}
      playerIndex={playerIndex}
      playersCount={game.players.length}
      onSelectPlayer={onSelectPlayer}
      playerName={player.name}
      footerLabel={
        editMode
          ? 'Retour au tableau des scores'
          : isLastPlayer
            ? 'Valider la manche'
            : 'Joueur suivant →'
      }
      onFooterPress={editMode ? onOpenScoreboard : onNext}
      footerDisabled={!editMode && !complete}
    >
      <BidStepper cards={cards} value={entry.bid} onChange={onChangeBid} />

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

      {showBidKind && (
        <BidKindField bidKind={bidKind} onChange={onChangeBidKind} />
      )}

      <RoundField label="Bonus & malus">
        <BonusButtons value={entry.bonus ?? 0} onChange={onChangeBonus} />
      </RoundField>

      {tricksMismatch && <Callout>{tricksMismatch}</Callout>}

      <RoundScoreReadout score={roundScore} />
    </RoundPlayerFrame>
  );
}
