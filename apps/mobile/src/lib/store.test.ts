// Tests fonctionnels du store Skull King : on pilote la partie par ses actions,
// exactement comme le font les écrans (création → saisie → validation →
// correction), plus les migrations du state persisté.
// Le moteur de calcul lui-même est testé à part dans scoring.test.ts.
import { cumulativeTotal, cumulativeTotals, roundTotal } from './scoring';
import { awards } from './stats';
import { migratePersistedState, PERSIST_VERSION, useStore } from './store';
import { Game, GameSetup } from './types';

// AsyncStorage n'existe pas hors app : le mock officiel du package suffit, le
// middleware persist tourne alors normalement sans toucher à un module natif.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory runs before ESM imports are available
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const RASCAL_SETUP: GameSetup = {
  cardsPerRound: [2, 4],
  scoreSystem: 'rascal',
  cannonballRule: true,
};

const CLASSIC_SETUP: GameSetup = {
  cardsPerRound: [1, 2],
  scoreSystem: 'skull-king',
  cannonballRule: false,
};

/** La partie en cours, ou une erreur explicite si le test l'a perdue en route. */
function activeGame(): Game {
  const g = useStore.getState().game;
  if (!g) throw new Error('aucune partie en cours');
  return g;
}

/** Identifiants des joueurs dans l'ordre de création. */
function playerIds(): string[] {
  return activeGame().players.map((p) => p.id);
}

beforeEach(() => {
  // Le store est un singleton : on repart d'un état neuf à chaque test.
  useStore.setState({ screen: 'games', game: null, beloteGame: null });
});

describe('startGame', () => {
  it('crée la partie avec le format et le système choisis, et ouvre la saisie', () => {
    useStore.getState().startGame('skull-king', ['Alice', 'Bob'], RASCAL_SETUP);

    const game = activeGame();
    expect(game.players.map((p) => p.name)).toEqual(['Alice', 'Bob']);
    expect(game.cardsPerRound).toEqual([2, 4]);
    expect(game.scoreSystem).toBe('rascal');
    expect(game.cannonballRule).toBe(true);
    expect(game.currentRound).toBe(1);
    expect(game.finishedAt).toBeUndefined();
    expect(useStore.getState().screen).toBe('round');
  });

  it('démarre la manche 1 à zéro en chevrotine et laisse les suivantes vierges', () => {
    useStore.getState().startGame('skull-king', ['Alice', 'Bob'], RASCAL_SETUP);
    const [p1] = playerIds();

    expect(activeGame().rounds[1][p1]).toEqual({
      bid: 0,
      tricks: 0,
      bonus: 0,
      bidKind: 'chevrotine',
      validated: false,
    });
    // Manche non atteinte : non saisie, donc hors des totaux.
    expect(activeGame().rounds[2][p1].bid).toBeNull();
    expect(cumulativeTotal(activeGame(), p1)).toBe(0);
  });

  it("ne traîne pas l'option boulet de canon en système classique", () => {
    useStore
      .getState()
      .startGame('skull-king', ['Alice', 'Bob'], CLASSIC_SETUP);

    expect(activeGame().scoreSystem).toBe('skull-king');
    expect(activeGame().cannonballRule).toBe(false);
  });
});

describe('saisie et validation des manches (Rascal)', () => {
  /** Manche 1 (2 cartes) saisie mais pas encore validée : coup direct / frappe à revers. */
  function startAndFillFirstRound(): [string, string] {
    useStore.getState().startGame('skull-king', ['Alice', 'Bob'], RASCAL_SETUP);
    const [p1, p2] = playerIds();
    const { setBid, setTricks } = useStore.getState();
    setBid(1, p1, 1);
    setTricks(1, p1, 1); // écart 0 → 100 % de 10 × 2 = 20
    setBid(1, p2, 0);
    setTricks(1, p2, 1); // écart 1 → 50 % de 20 = 10
    return [p1, p2];
  }

  it('valide la manche, ouvre la suivante et cumule les scores du système', () => {
    const [p1, p2] = startAndFillFirstRound();

    // Rien ne compte tant que la manche n'est pas validée.
    expect(cumulativeTotals(activeGame())).toEqual({ [p1]: 0, [p2]: 0 });

    useStore.getState().commitRound();

    const game = activeGame();
    expect(game.currentRound).toBe(2);
    expect(game.rounds[1][p1].validated).toBe(true);
    expect(game.rounds[1][p2].validated).toBe(true);
    expect(cumulativeTotals(game)).toEqual({ [p1]: 20, [p2]: 10 });
    // La manche ouverte démarre à zéro, prête à être saisie.
    expect(game.rounds[2][p1]).toMatchObject({ bid: 0, tricks: 0 });
  });

  it('applique le type de mise de chaque joueur (boulet de canon)', () => {
    const [p1, p2] = startAndFillFirstRound();
    useStore.getState().commitRound();

    const { setBid, setTricks, setBonus, setBidKind } = useStore.getState();
    // Manche 2 = 4 cartes. p1 tente le boulet et le réussit : 15 × 4 = 60.
    setBidKind(2, p1, 'boulet');
    setBid(2, p1, 2);
    setTricks(2, p1, 2);
    // p2 tente le boulet et le rate d'un pli : 0, bonus compris.
    setBidKind(2, p2, 'boulet');
    setBid(2, p2, 2);
    setTricks(2, p2, 3);
    setBonus(2, p2, 30);

    useStore.getState().commitRound();

    expect(cumulativeTotals(activeGame())).toEqual({ [p1]: 20 + 60, [p2]: 10 });
  });

  it('changer le type de mise recalcule le score sans toucher à la saisie', () => {
    const [p1] = startAndFillFirstRound();
    useStore.getState().commitRound();

    const { setBid, setTricks, setBidKind } = useStore.getState();
    setBid(2, p1, 2);
    setTricks(2, p1, 2);
    expect(roundTotal(activeGame().rounds[2][p1], 4, 'rascal')).toBe(40); // chevrotine

    setBidKind(2, p1, 'boulet');

    const entry = activeGame().rounds[2][p1];
    expect(entry.bid).toBe(2);
    expect(entry.tricks).toBe(2);
    expect(roundTotal(entry, 4, 'rascal')).toBe(60);
  });

  it('termine la partie après la dernière manche', () => {
    const [p1] = startAndFillFirstRound();
    useStore.getState().commitRound();

    const { setBid, setTricks } = useStore.getState();
    setBid(2, p1, 1);
    setTricks(2, p1, 1);
    useStore.getState().commitRound();

    expect(activeGame().finishedAt).toEqual(expect.any(Number));
    expect(useStore.getState().screen).toBe('scoreboard');
  });
});

describe("correction d'une manche", () => {
  it('revenir à la manche précédente ne perd pas la manche en cours', () => {
    useStore.getState().startGame('skull-king', ['Alice'], CLASSIC_SETUP);
    const [p1] = playerIds();
    const { setBid, setTricks, commitRound, goToRound } = useStore.getState();

    setBid(1, p1, 1);
    setTricks(1, p1, 1); // +20
    commitRound();
    setBid(2, p1, 2); // saisie en cours sur la manche 2

    goToRound(1);

    expect(activeGame().currentRound).toBe(1);
    expect(useStore.getState().screen).toBe('round');
    expect(activeGame().rounds[2][p1].bid).toBe(2);
    expect(activeGame().rounds[1][p1].validated).toBe(true);
  });

  it('corriger une manche validée met le total à jour immédiatement', () => {
    useStore.getState().startGame('skull-king', ['Alice'], CLASSIC_SETUP);
    const [p1] = playerIds();
    const { setBid, setTricks, commitRound, goToRound } = useStore.getState();

    setBid(1, p1, 1);
    setTricks(1, p1, 1);
    commitRound();
    expect(cumulativeTotal(activeGame(), p1)).toBe(20);

    goToRound(1);
    setTricks(1, p1, 0); // mise ratée d'un pli → -10

    // La manche reste validée : la correction s'applique sans re-valider.
    expect(activeGame().rounds[1][p1].validated).toBe(true);
    expect(cumulativeTotal(activeGame(), p1)).toBe(-10);
  });

  it('reste corrigeable une fois la partie terminée', () => {
    useStore.getState().startGame('skull-king', ['Alice'], {
      ...CLASSIC_SETUP,
      cardsPerRound: [1],
    });
    const [p1] = playerIds();
    const { setBid, setTricks, commitRound, goToRound } = useStore.getState();

    setBid(1, p1, 1);
    setTricks(1, p1, 1);
    commitRound();
    const finishedAt = activeGame().finishedAt;
    expect(finishedAt).toEqual(expect.any(Number));

    goToRound(1);
    setTricks(1, p1, 0);

    // On corrige un résultat, pas on relance la partie.
    expect(activeGame().finishedAt).toBe(finishedAt);
    expect(cumulativeTotal(activeGame(), p1)).toBe(-10);
  });
});

describe('palmarès de fin de partie', () => {
  it('suit les corrections faites après la fin de la partie', () => {
    useStore.getState().startGame('skull-king', ['Alice', 'Bob'], {
      ...CLASSIC_SETUP,
      cardsPerRound: [2, 2],
    });
    const [p1, p2] = playerIds();
    const { setBid, setTricks, commitRound, goToRound } = useStore.getState();

    // Manche 1 : Alice rafle les deux plis. Manche 2 : un pli chacun.
    setBid(1, p1, 2);
    setTricks(1, p1, 2);
    setBid(1, p2, 0);
    setTricks(1, p2, 0);
    commitRound();
    setBid(2, p1, 1);
    setTricks(2, p1, 1);
    setBid(2, p2, 1);
    setTricks(2, p2, 1);
    commitRound();

    const titleHolder = (key: string) =>
      awards(activeGame()).find((a) => a.key === key)?.playerIds;
    expect(activeGame().finishedAt).toEqual(expect.any(Number));
    expect(titleHolder('loup-de-mer')).toEqual([p1]); // 3 plis contre 1
    expect(titleHolder('marin-eau-douce')).toEqual([p2]);

    // On s'était trompé de camp sur la manche 1 : les titres changent de main.
    goToRound(1);
    setTricks(1, p1, 0);
    setTricks(1, p2, 2);

    expect(titleHolder('loup-de-mer')).toEqual([p2]);
    expect(titleHolder('marin-eau-douce')).toEqual([p1]);
  });
});

describe('reprise et abandon', () => {
  it('reprend une partie en cours sur la saisie, une partie finie sur le tableau', () => {
    useStore.getState().startGame('skull-king', ['Alice'], CLASSIC_SETUP);
    useStore.setState({ screen: 'home' });

    useStore.getState().resumeGame();
    expect(useStore.getState().screen).toBe('round');

    useStore.setState({
      game: { ...activeGame(), finishedAt: Date.now() },
      screen: 'home',
    });
    useStore.getState().resumeGame();
    expect(useStore.getState().screen).toBe('scoreboard');
  });

  it('abandonner efface la partie Skull King sans toucher à la Belote', () => {
    useStore.getState().startGame('skull-king', ['Alice'], CLASSIC_SETUP);
    useStore.getState().startBeloteGame(
      [
        { id: 't1', players: ['Alice', 'Bob'] },
        { id: 't2', players: ['Chloé', 'David'] },
      ],
      501,
    );

    useStore.getState().abandonGame();

    expect(useStore.getState().game).toBeNull();
    expect(useStore.getState().beloteGame).not.toBeNull();
    expect(useStore.getState().screen).toBe('home');
  });
});

describe('migratePersistedState', () => {
  it("efface une partie d'avant les formats (pas de cardsPerRound à reconstituer)", () => {
    const legacy = {
      game: {
        id: 'g0',
        gameKey: 'skull-king',
        players: [{ id: 'p1', name: 'Alice' }],
        totalRounds: 10, // ancien champ, remplacé par cardsPerRound
        currentRound: 3,
        rounds: {},
        createdAt: 0,
      },
      beloteGame: null,
    };

    expect(migratePersistedState(legacy, 0).game).toBeNull();
  });

  it("complète une partie d'avant le choix du système : classique, sans boulet", () => {
    const legacy = {
      game: {
        id: 'g1',
        gameKey: 'skull-king',
        players: [{ id: 'p1', name: 'Alice' }],
        cardsPerRound: [1, 2],
        currentRound: 2,
        rounds: { 1: { p1: { bid: 1, tricks: 1, bonus: 0, validated: true } } },
        createdAt: 0,
      },
      beloteGame: null,
    };

    const migrated = migratePersistedState(legacy, 1);

    expect(migrated.game).toMatchObject({
      scoreSystem: 'skull-king',
      cannonballRule: false,
      // le reste de la partie est conservé tel quel
      currentRound: 2,
      cardsPerRound: [1, 2],
      rounds: { 1: { p1: { bid: 1, tricks: 1, bonus: 0, validated: true } } },
    });
  });

  it('ne touche pas à une partie déjà à jour (une partie Rascal reste Rascal)', () => {
    const current = {
      game: {
        id: 'g2',
        gameKey: 'skull-king',
        players: [{ id: 'p1', name: 'Alice' }],
        cardsPerRound: [2, 4],
        scoreSystem: 'rascal' as const,
        cannonballRule: true,
        currentRound: 1,
        rounds: {},
        createdAt: 0,
      },
      beloteGame: null,
    };

    expect(migratePersistedState(current, PERSIST_VERSION)).toBe(current);
  });

  it('supporte un state sans partie Skull King', () => {
    expect(
      migratePersistedState({ game: null, beloteGame: null }, 0).game,
    ).toBeNull();
  });
});
