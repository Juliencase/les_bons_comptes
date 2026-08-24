// Écran d'accueil Skull King : nouvelle partie, reprendre, ou voir le dernier tableau.
import React from 'react';
import GameHomeScreen from '../components/GameHomeScreen';
import { getGame, playerRange } from '../lib/games';
import { getScoreSystem } from '../lib/scoreSystems';
import { useStore } from '../lib/store';

// Seul Skull King est implémenté pour l'instant — cf. CLAUDE.md.
const activeGame = getGame('skull-king');

// Dimensions du logo Skull King (assets/game/skull_king.png) : 1567x1186 px.
const LOGO_RATIO = 1186 / 1567;

export default function HomeScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const resumeGame = useStore((s) => s.resumeGame);

  const hasGame = !!game;
  const finished = !!game?.finishedAt;

  return (
    <GameHomeScreen
      image={require('../../assets/game/skull_king.png')}
      imageRatio={LOGO_RATIO}
      title="Skull King"
      playerRangeText={playerRange(activeGame)}
      durationMin={activeGame.duration}
      footer={
        hasGame && !finished
          ? `Système ${getScoreSystem(game!.scoreSystem).name} · ${playerRange(activeGame)} joueurs`
          : `Classique ou Rascal · ${playerRange(activeGame)} joueurs`
      }
      onBack={() => setScreen('games')}
      onNewGame={() => setScreen('setup')}
      resumeLabel={
        hasGame && !finished ? `Reprendre — manche ${game!.currentRound}/${game!.cardsPerRound.length}` : undefined
      }
      onResume={hasGame && !finished ? resumeGame : undefined}
      showScoreboard={hasGame}
      scoreboardLabel={finished ? 'Voir le résultat final' : 'Voir le tableau des scores'}
      onScoreboard={() => setScreen('scoreboard')}
    />
  );
}
