// Store global Zustand : partie active + navigation par écran + persistance locale.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_TOTAL_ROUNDS,
  Game,
  Player,
  RoundEntry,
  Screen,
} from './types';

// --- Helpers -----------------------------------------------------------------

let idCounter = 0;
/** Identifiant unique simple (pas de crypto requise pour un score local). */
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** Entrée d'une manche future : non jouée → ne compte pas dans les totaux. */
function emptyEntry(): RoundEntry {
  return { bid: null, tricks: null, bonus: 0 };
}

/** Entrée d'une manche atteinte : démarre à 0 (pas besoin de cliquer pour un 0). */
function zeroEntry(): RoundEntry {
  return { bid: 0, tricks: 0, bonus: 0 };
}

/** Initialise à 0 les entrées d'une manche encore vierges (sans écraser l'existant). */
function initRoundToZero(game: Game, round: number): Game {
  if (round < 1 || round > game.totalRounds) return game;
  const prev = game.rounds[round] ?? {};
  const next: Record<string, RoundEntry> = {};
  let changed = false;
  for (const p of game.players) {
    const e = prev[p.id];
    if (!e || (e.bid == null && e.tricks == null)) {
      next[p.id] = zeroEntry();
      changed = true;
    } else {
      next[p.id] = e;
    }
  }
  if (!changed) return game;
  return { ...game, rounds: { ...game.rounds, [round]: next } };
}

function createGame(names: string[]): Game {
  const players: Player[] = names.map((name) => ({
    id: makeId('p'),
    name: name.trim(),
  }));
  const rounds: Game['rounds'] = {};
  for (let r = 1; r <= DEFAULT_TOTAL_ROUNDS; r++) {
    rounds[r] = {};
    // Manche 1 démarrée à 0 ; manches suivantes vierges (non comptées).
    for (const p of players) {
      rounds[r][p.id] = r === 1 ? zeroEntry() : emptyEntry();
    }
  }
  return {
    id: makeId('g'),
    players,
    totalRounds: DEFAULT_TOTAL_ROUNDS,
    currentRound: 1,
    rounds,
    createdAt: Date.now(),
  };
}

// --- Store -------------------------------------------------------------------

type State = {
  screen: Screen;
  game: Game | null;
  hydrated: boolean; // persist rehydration terminée
};

type Actions = {
  markHydrated: () => void;
  setScreen: (s: Screen) => void;
  startGame: (names: string[]) => void;
  resumeGame: () => void;
  abandonGame: () => void;
  setBid: (round: number, playerId: string, value: number) => void;
  setTricks: (round: number, playerId: string, value: number) => void;
  setBonus: (round: number, playerId: string, value: number) => void;
  commitRound: () => void;
  goToRound: (round: number) => void;
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      screen: 'home',
      game: null,
      hydrated: false,

      markHydrated: () => set({ hydrated: true }),

      setScreen: (screen) => set({ screen }),

      startGame: (names) => {
        set({ game: createGame(names), screen: 'round' });
      },

      resumeGame: () => {
        const g = get().game;
        if (!g) return;
        set({ screen: g.finishedAt ? 'scoreboard' : 'round' });
      },

      abandonGame: () => set({ game: null, screen: 'home' }),

      setBid: (round, playerId, value) =>
        set((state) => updateEntry(state, round, playerId, { bid: value })),

      setTricks: (round, playerId, value) =>
        set((state) => updateEntry(state, round, playerId, { tricks: value })),

      setBonus: (round, playerId, value) =>
        set((state) => updateEntry(state, round, playerId, { bonus: value })),

      commitRound: () => {
        const g = get().game;
        if (!g) return;
        if (g.currentRound >= g.totalRounds) {
          set({
            game: { ...g, finishedAt: Date.now() },
            screen: 'scoreboard',
          });
        } else {
          const next = g.currentRound + 1;
          // Initialise la manche suivante à 0 (si vierge) pour éviter les clics inutiles.
          const withInit = initRoundToZero(g, next);
          set({ game: { ...withInit, currentRound: next } });
        }
      },

      goToRound: (round) => {
        const g = get().game;
        if (!g) return;
        const clamped = Math.min(Math.max(round, 1), g.totalRounds);
        // Une manche déjà atteinte a des valeurs ; sécurité si on tombe sur une vierge.
        const withInit = initRoundToZero(g, clamped);
        set({ game: { ...withInit, currentRound: clamped }, screen: 'round' });
      },
    }),
    {
      name: 'skullking-store',
      storage: createJSONStorage(() => AsyncStorage),
      // On ne persiste que la partie, pas l'écran courant ni l'état d'hydratation.
      partialize: (state) => ({ game: state.game }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

/** Applique une mise à jour partielle à une entrée (immutabilité). */
function updateEntry(
  state: State & Actions,
  round: number,
  playerId: string,
  patch: Partial<RoundEntry>,
): Partial<State> {
  const g = state.game;
  if (!g) return {};
  const prevRound = g.rounds[round] ?? {};
  const prevEntry = prevRound[playerId] ?? emptyEntry();
  const nextEntry = { ...prevEntry, ...patch };
  return {
    game: {
      ...g,
      rounds: {
        ...g.rounds,
        [round]: { ...prevRound, [playerId]: nextEntry },
      },
    },
  };
}
