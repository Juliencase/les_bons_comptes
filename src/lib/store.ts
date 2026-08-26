// Store global Zustand : partie active + navigation par écran + persistance locale.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BidKind, Game, GameSetup, Player, RoundEntry, Screen } from './types';
import { DEFAULT_BID_KIND } from './scoring';
import { BeloteGame, BeloteHandEntry, BeloteTeam } from './belote/types';
import { HAND_TOTAL_POINTS, winningTeamId } from './belote/scoring';

// --- Helpers -----------------------------------------------------------------

let idCounter = 0;
/** Identifiant unique simple (pas de crypto requise pour un score local). */
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** Entrée d'une manche future : non jouée → ne compte pas dans les totaux. */
function emptyEntry(): RoundEntry {
  return {
    bid: null,
    tricks: null,
    bonus: 0,
    bidKind: DEFAULT_BID_KIND,
    validated: false,
  };
}

/** Entrée d'une manche atteinte : démarre à 0 (pas besoin de cliquer pour un 0). */
function zeroEntry(): RoundEntry {
  return {
    bid: 0,
    tricks: 0,
    bonus: 0,
    bidKind: DEFAULT_BID_KIND,
    validated: false,
  };
}

/** Initialise à 0 les entrées d'une manche encore vierges (sans écraser l'existant). */
function initRoundToZero(game: Game, round: number): Game {
  if (round < 1 || round > game.cardsPerRound.length) return game;
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

function createGame(gameKey: string, names: string[], setup: GameSetup): Game {
  const players: Player[] = names.map((name) => ({
    id: makeId('p'),
    name: name.trim(),
  }));
  const rounds: Game['rounds'] = {};
  for (let r = 1; r <= setup.cardsPerRound.length; r++) {
    rounds[r] = {};
    // Manche 1 démarrée à 0 ; manches suivantes vierges (non comptées).
    for (const p of players) {
      rounds[r][p.id] = r === 1 ? zeroEntry() : emptyEntry();
    }
  }
  return {
    ...setup,
    id: makeId('g'),
    gameKey,
    players,
    currentRound: 1,
    rounds,
    createdAt: Date.now(),
  };
}

/** Manche de Belote vierge : preneur par défaut = 1re équipe, points non saisis. */
function defaultHand(teams: [BeloteTeam, BeloteTeam]): BeloteHandEntry {
  return {
    takerTeamId: teams[0].id,
    teamAPoints: null,
    capotTeamId: null,
    beloteRebeloteTeamId: null,
    validated: false,
  };
}

function createBeloteGame(
  teams: [BeloteTeam, BeloteTeam],
  targetScore: number,
): BeloteGame {
  return {
    id: makeId('bg'),
    gameKey: 'belote',
    teams,
    targetScore,
    currentHand: 1,
    hands: { 1: defaultHand(teams) },
    createdAt: Date.now(),
  };
}

// --- Persistance -------------------------------------------------------------

/** Forme du state persisté (cf. partialize : les deux parties, pas l'écran courant). */
type PersistedState = { game?: Game | null; beloteGame?: BeloteGame | null };

export const PERSIST_VERSION = 2;

/**
 * Migrations du state persisté (exportée à part pour être testable) :
 * - v1 : Game.totalRounds (number) → Game.cardsPerRound (number[]). Une partie
 *   persistée avant ce changement n'a pas de cardsPerRound et ferait planter tous
 *   les écrans Skull King qui lisent `game.cardsPerRound.length`/`[...]` — on
 *   l'efface plutôt que de deviner un format qu'on ne peut pas reconstituer
 *   fidèlement.
 * - v2 : ajout du système de score (Game.scoreSystem / cannonballRule). Une
 *   partie persistée avant ce changement se jouait forcément au système
 *   classique, sans option Rascal — on complète au lieu de l'effacer.
 * Le tableau Belote n'est concerné par aucune des deux.
 *
 * Les étapes s'enchaînent (pas de `return` anticipé) : un état stocké en v1
 * doit pouvoir traverser la v2 puis la v3 le jour où elle existera.
 */
export function migratePersistedState(persisted: unknown, version: number) {
  let state = persisted as PersistedState;

  if (version < 1 && state?.game && !Array.isArray(state.game.cardsPerRound)) {
    state = { ...state, game: null };
  }

  if (version < 2 && state?.game) {
    const migrated: Game = {
      ...state.game,
      scoreSystem: 'skull-king',
      cannonballRule: false,
    };
    state = { ...state, game: migrated };
  }

  return state;
}

// --- Store -------------------------------------------------------------------

type State = {
  screen: Screen;
  game: Game | null;
  beloteGame: BeloteGame | null;
  hydrated: boolean; // persist rehydration terminée
};

type Actions = {
  markHydrated: () => void;
  setScreen: (s: Screen) => void;
  startGame: (gameKey: string, names: string[], setup: GameSetup) => void;
  resumeGame: () => void;
  abandonGame: () => void;
  setBid: (round: number, playerId: string, value: number) => void;
  setTricks: (round: number, playerId: string, value: number) => void;
  setBonus: (round: number, playerId: string, value: number) => void;
  setBidKind: (round: number, playerId: string, kind: BidKind) => void;
  commitRound: () => void;
  goToRound: (round: number) => void;
  startBeloteGame: (
    teams: [BeloteTeam, BeloteTeam],
    targetScore: number,
  ) => void;
  resumeBeloteGame: () => void;
  setHandTaker: (hand: number, teamId: string) => void;
  setHandTeamPoints: (
    hand: number,
    teamId: string,
    points: number | null,
  ) => void;
  setHandCapot: (hand: number, teamId: string | null) => void;
  setHandBeloteRebelote: (hand: number, teamId: string | null) => void;
  commitBeloteHand: () => void;
  goToBeloteHand: (hand: number) => void;
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      screen: 'games',
      game: null,
      beloteGame: null,
      hydrated: false,

      markHydrated: () => set({ hydrated: true }),

      setScreen: (screen) => set({ screen }),

      startGame: (gameKey, names, setup) => {
        set({ game: createGame(gameKey, names, setup), screen: 'round' });
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

      setBidKind: (round, playerId, kind) =>
        set((state) => updateEntry(state, round, playerId, { bidKind: kind })),

      commitRound: () => {
        const g = get().game;
        if (!g) return;
        // Marque la manche actuelle comme validée
        const roundEntries = g.rounds[g.currentRound] ?? {};
        const validatedRound: Record<string, RoundEntry> = {};
        for (const p of g.players) {
          const entry = roundEntries[p.id] ?? emptyEntry();
          validatedRound[p.id] = { ...entry, validated: true };
        }
        const gameWithValidated = {
          ...g,
          rounds: { ...g.rounds, [g.currentRound]: validatedRound },
        };

        if (g.currentRound >= g.cardsPerRound.length) {
          set({
            game: { ...gameWithValidated, finishedAt: Date.now() },
            screen: 'scoreboard',
          });
        } else {
          const next = g.currentRound + 1;
          // Initialise la manche suivante à 0 (si vierge) pour éviter les clics inutiles.
          const withInit = initRoundToZero(gameWithValidated, next);
          set({ game: { ...withInit, currentRound: next } });
        }
      },

      goToRound: (round) => {
        const g = get().game;
        if (!g) return;
        const clamped = Math.min(Math.max(round, 1), g.cardsPerRound.length);
        // Une manche déjà atteinte a des valeurs ; sécurité si on tombe sur une vierge.
        const withInit = initRoundToZero(g, clamped);
        set({ game: { ...withInit, currentRound: clamped }, screen: 'round' });
      },

      startBeloteGame: (teams, targetScore) => {
        set({
          beloteGame: createBeloteGame(teams, targetScore),
          screen: 'belote-round',
        });
      },

      resumeBeloteGame: () => {
        const g = get().beloteGame;
        if (!g) return;
        set({ screen: g.finishedAt ? 'belote-scoreboard' : 'belote-round' });
      },

      setHandTaker: (hand, teamId) =>
        set((state) => updateHand(state, hand, { takerTeamId: teamId })),

      setHandTeamPoints: (hand, teamId, points) =>
        set((state) => {
          const g = state.beloteGame;
          if (!g) return {};
          // Effacer l'un ou l'autre champ remet la manche à « rien saisi » : les deux
          // valeurs sont liées (teamAPoints / 162 - teamAPoints), il n'existe pas d'état
          // où l'une est vide et l'autre non.
          const teamAPoints =
            points == null
              ? null
              : teamId === g.teams[0].id
                ? points
                : HAND_TOTAL_POINTS - points;
          return updateHand(state, hand, { teamAPoints });
        }),

      setHandCapot: (hand, teamId) =>
        set((state) => updateHand(state, hand, { capotTeamId: teamId })),

      setHandBeloteRebelote: (hand, teamId) =>
        set((state) =>
          updateHand(state, hand, { beloteRebeloteTeamId: teamId }),
        ),

      commitBeloteHand: () => {
        const g = get().beloteGame;
        if (!g) return;
        const hand = g.hands[g.currentHand];
        if (!hand) return;
        const gameWithValidated = {
          ...g,
          hands: { ...g.hands, [g.currentHand]: { ...hand, validated: true } },
        };

        const winner = winningTeamId(gameWithValidated);
        if (winner) {
          set({
            beloteGame: { ...gameWithValidated, finishedAt: Date.now() },
            screen: 'belote-scoreboard',
          });
        } else {
          const next = g.currentHand + 1;
          set({
            beloteGame: {
              ...gameWithValidated,
              hands: {
                ...gameWithValidated.hands,
                [next]: gameWithValidated.hands[next] ?? defaultHand(g.teams),
              },
              currentHand: next,
            },
          });
        }
      },

      goToBeloteHand: (hand) => {
        const g = get().beloteGame;
        if (!g) return;
        const clamped = Math.min(Math.max(hand, 1), g.currentHand);
        set({
          beloteGame: { ...g, currentHand: clamped },
          screen: 'belote-round',
        });
      },
    }),
    {
      name: 'skullking-store',
      storage: createJSONStorage(() => AsyncStorage),
      // On ne persiste que les parties, pas l'écran courant ni l'état d'hydratation.
      partialize: (state) => ({
        game: state.game,
        beloteGame: state.beloteGame,
      }),
      onRehydrateStorage: () => (state, error) => {
        // Sans ce garde-fou, un storage corrompu ou une migration qui jette
        // laisserait `hydrated` à false — et l'app bloquée sur son spinner
        // (cf. la branche de chargement d'App.tsx). On repart alors sans
        // partie plutôt que de ne jamais démarrer.
        if (error) {
          useStore.setState({ hydrated: true });
          return;
        }
        state?.markHydrated();
      },
      // Historique des versions et raison de chaque migration : cf.
      // migratePersistedState ci-dessus.
      version: PERSIST_VERSION,
      migrate: migratePersistedState,
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

/** Applique une mise à jour partielle à une manche de Belote (immutabilité). */
function updateHand(
  state: State & Actions,
  hand: number,
  patch: Partial<BeloteHandEntry>,
): Partial<State> {
  const g = state.beloteGame;
  if (!g) return {};
  const prevHand = g.hands[hand] ?? defaultHand(g.teams);
  return {
    beloteGame: {
      ...g,
      hands: { ...g.hands, [hand]: { ...prevHand, ...patch } },
    },
  };
}
