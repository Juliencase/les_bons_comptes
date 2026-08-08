// Écran d'accueil Belote : nouvelle partie, reprendre, ou voir le dernier tableau.
import React from 'react';
import GameHomeScreen from '../components/GameHomeScreen';
import { getGame, playerRange } from '../lib/games';
import { useStore } from '../lib/store';

const activeGame = getGame('belote');

// Dimensions du logo Belote (assets/game/belote.png) : 1536x1024 px.
const LOGO_RATIO = 1024 / 1536;

export default function BeloteHomeScreen() {
  const beloteGame = useStore((s) => s.beloteGame);
  const setScreen = useStore((s) => s.setScreen);
  const resumeBeloteGame = useStore((s) => s.resumeBeloteGame);

  const hasGame = !!beloteGame;
  const finished = !!beloteGame?.finishedAt;

  return (
    <GameHomeScreen
      image={require('../../assets/game/belote.png')}
      imageRatio={LOGO_RATIO}
      title="Belote"
      playerRangeText={playerRange(activeGame)}
      durationMin={activeGame.duration}
      footer={`Belote classique · contrat à 82 · ${playerRange(activeGame)} joueurs`}
      onBack={() => setScreen('games')}
      onNewGame={() => setScreen('belote-setup')}
      resumeLabel={hasGame && !finished ? `Reprendre — manche ${beloteGame!.currentHand}` : undefined}
      onResume={hasGame && !finished ? resumeBeloteGame : undefined}
      showScoreboard={hasGame}
      scoreboardLabel={finished ? 'Voir le résultat final' : 'Voir le tableau des scores'}
      onScoreboard={() => setScreen('belote-scoreboard')}
    />
  );
}
