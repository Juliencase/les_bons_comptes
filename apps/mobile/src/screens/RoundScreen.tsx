// Écran de saisie de la manche courante. Une manche fraîche (aucune entrée
// validée) suit un flux en 3 phases locales — mises (RoundBidsView), rappel du
// classement (RoundRecapView), puis plis et bonus (RoundTricksView). Une
// manche déjà validée (correction en cours de partie via « Manche
// précédente », ou après la fin de la partie) garde l'écran combiné
// historique (RoundCorrectionView), un seul joueur à la fois.
import React, { useEffect, useState } from 'react';
import RoundBidsView from '../components/RoundBidsView';
import RoundCorrectionView from '../components/RoundCorrectionView';
import RoundRecapView from '../components/RoundRecapView';
import RoundTricksView from '../components/RoundTricksView';
import { useStore } from '../lib/store';
import { isEntryComplete } from '../lib/scoring';

type FreshPhase = 'bids' | 'recap' | 'tricks';

export default function RoundScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const setBid = useStore((s) => s.setBid);
  const setTricks = useStore((s) => s.setTricks);
  const setBonus = useStore((s) => s.setBonus);
  const setBidKind = useStore((s) => s.setBidKind);
  const commitRound = useStore((s) => s.commitRound);
  const goToRound = useStore((s) => s.goToRound);

  // Position dans la manche et phase du flux « manche fraîche » — état local,
  // non persisté. Ni l'un ni l'autre ne peut se dériver de isEntryComplete :
  // une manche atteinte démarre à 0 partout (zeroEntry, cf. store.ts), donc
  // chaque entrée est déjà « complète » avant même d'avoir été regardée. On
  // repart toujours du premier joueur et de la phase « mises » à l'arrivée sur
  // l'écran (nouvelle manche, retour des scores, correction).
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<FreshPhase>('bids');
  useEffect(() => {
    setIndex(0);
    setPhase('bids');
  }, [game?.currentRound]);

  if (!game) return null;

  const round = game.currentRound;
  const entries = game.players.map((p) => game.rounds[round]?.[p.id]);
  // Une manche fraîche démarre avec `validated: false` sur toutes ses entrées
  // (zeroEntry) ; une manche déjà validée (correction) les a toutes à true.
  const isFreshRound = !entries.some((e) => e?.validated);

  const editMode = !!game.finishedAt;
  const backLabel = editMode
    ? 'Scores'
    : round > 1
      ? `Manche ${String(round - 1).padStart(2, '0')}`
      : 'Accueil';
  const onBack = () => {
    if (editMode) setScreen('scoreboard');
    else if (round > 1) goToRound(round - 1);
    else setScreen('home');
  };
  const onOpenScoreboard = () => setScreen('scoreboard');

  const playerIndex = Math.min(index, game.players.length - 1);
  const player = game.players[playerIndex];

  const goToNextPlayerOrCommit = () => {
    if (playerIndex === game.players.length - 1) {
      if (entries.every((e) => isEntryComplete(e))) commitRound();
    } else {
      setIndex(playerIndex + 1);
    }
  };

  if (!isFreshRound) {
    return (
      <RoundCorrectionView
        game={game}
        round={round}
        playerIndex={playerIndex}
        onSelectPlayer={setIndex}
        onNext={goToNextPlayerOrCommit}
        backLabel={backLabel}
        onBack={onBack}
        onOpenScoreboard={onOpenScoreboard}
        onChangeBid={(v) => setBid(round, player.id, v)}
        onChangeTricks={(v) => setTricks(round, player.id, v)}
        onChangeBonus={(v) => setBonus(round, player.id, v)}
        onChangeBidKind={(kind) => setBidKind(round, player.id, kind)}
      />
    );
  }

  if (phase === 'bids') {
    return (
      <RoundBidsView
        game={game}
        round={round}
        playerIndex={playerIndex}
        onSelectPlayer={setIndex}
        backLabel={backLabel}
        onBack={onBack}
        onOpenScoreboard={onOpenScoreboard}
        onChangeBid={(v) => setBid(round, player.id, v)}
        onChangeBidKind={(kind) => setBidKind(round, player.id, kind)}
        onNext={() => {
          if (playerIndex === game.players.length - 1) {
            setPhase('recap');
            setIndex(0);
          } else {
            setIndex(playerIndex + 1);
          }
        }}
      />
    );
  }

  if (phase === 'recap') {
    return (
      <RoundRecapView
        game={game}
        round={round}
        backLabel={backLabel}
        onBack={onBack}
        onOpenScoreboard={onOpenScoreboard}
        onContinue={() => setPhase('tricks')}
      />
    );
  }

  return (
    <RoundTricksView
      game={game}
      round={round}
      playerIndex={playerIndex}
      onSelectPlayer={setIndex}
      backLabel={backLabel}
      onBack={onBack}
      onOpenScoreboard={onOpenScoreboard}
      onChangeTricks={(v) => setTricks(round, player.id, v)}
      onChangeBonus={(v) => setBonus(round, player.id, v)}
      onNext={goToNextPlayerOrCommit}
    />
  );
}
