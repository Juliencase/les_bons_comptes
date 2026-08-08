// Tests du moteur de score « Skull King » classique — voir docs/REGLES_SKULL_KING.md §4.A.
import {
  bidScore,
  cardsForRound,
  cumulativeTotal,
  cumulativeTotals,
  isEntryComplete,
  ranking,
  roundTotal,
  tricksEnteredForRound,
} from './scoring';
import { Game, RoundEntry } from './types';

describe('cardsForRound', () => {
  it('manche N distribue N cartes (format standard)', () => {
    expect(cardsForRound(1)).toBe(1);
    expect(cardsForRound(7)).toBe(7);
    expect(cardsForRound(10)).toBe(10);
  });
});

describe('bidScore', () => {
  it('mise 0 réussie : +10 par carte distribuée', () => {
    expect(bidScore(0, 0, 7)).toBe(70);
  });

  it('mise 0 ratée : -10 par carte distribuée', () => {
    expect(bidScore(0, 2, 9)).toBe(-90);
  });

  it('mise ≥ 1 réussie : +20 par pli misé', () => {
    expect(bidScore(3, 3, 5)).toBe(60);
  });

  it('mise ≥ 1 ratée : -10 par pli d\'écart', () => {
    expect(bidScore(2, 4, 5)).toBe(-20);
  });

  it('le multiplicateur mise-0 suit les cartes distribuées, pas le n° de manche', () => {
    // Manche 9 avec seulement 6 cartes distribuées (ex. trop de joueurs) → base sur 6.
    expect(bidScore(0, 0, 6)).toBe(60);
  });
});

describe('isEntryComplete', () => {
  it('incomplète si bid ou tricks est null', () => {
    expect(isEntryComplete(undefined)).toBe(false);
    expect(isEntryComplete({ bid: null, tricks: 2, bonus: 0, validated: false })).toBe(false);
    expect(isEntryComplete({ bid: 2, tricks: null, bonus: 0, validated: false })).toBe(false);
  });

  it('complète si bid et tricks sont renseignés', () => {
    expect(isEntryComplete({ bid: 0, tricks: 0, bonus: 0, validated: false })).toBe(true);
  });
});

describe('roundTotal', () => {
  it('vaut 0 si la manche n\'est pas saisie', () => {
    expect(roundTotal(undefined, 5)).toBe(0);
    expect(roundTotal({ bid: null, tricks: null, bonus: 0, validated: false }, 5)).toBe(0);
  });

  it('additionne le score de mise et le bonus', () => {
    const entry: RoundEntry = { bid: 3, tricks: 3, bonus: 10, validated: true };
    expect(roundTotal(entry, 5)).toBe(60 + 10);
  });

  it('le bonus peut être négatif (ex. carte 7 de l\'extension)', () => {
    const entry: RoundEntry = { bid: 1, tricks: 1, bonus: -5, validated: true };
    expect(roundTotal(entry, 3)).toBe(20 - 5);
  });
});

function makeGame(overrides?: Partial<Game>): Game {
  return {
    id: 'g1',
    gameKey: 'skull-king',
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Chloé' },
    ],
    totalRounds: 3,
    currentRound: 1,
    rounds: {},
    createdAt: 0,
    ...overrides,
  };
}

describe('cumulativeTotal / cumulativeTotals', () => {
  it('ne compte que les manches validées et complètes', () => {
    const game = makeGame({
      rounds: {
        1: {
          p1: { bid: 1, tricks: 1, bonus: 0, validated: true }, // +20
          p2: { bid: 0, tricks: 0, bonus: 0, validated: true }, // +10
        },
        2: {
          // manche non validée → ignorée même si les valeurs sont saisies
          p1: { bid: 2, tricks: 2, bonus: 0, validated: false },
        },
        3: {
          // manche validée mais incomplète → ignorée
          p1: { bid: 3, tricks: null, bonus: 0, validated: true },
        },
      },
    });

    expect(cumulativeTotal(game, 'p1')).toBe(20);
    expect(cumulativeTotal(game, 'p2')).toBe(10);
    expect(cumulativeTotals(game)).toEqual({ p1: 20, p2: 10, p3: 0 });
  });
});

describe('ranking', () => {
  it('classe par total décroissant', () => {
    const game = makeGame({
      totalRounds: 1,
      rounds: {
        1: {
          p1: { bid: 1, tricks: 1, bonus: 0, validated: true }, // 20
          p2: { bid: 0, tricks: 1, bonus: 0, validated: true }, // -10
          p3: { bid: 2, tricks: 2, bonus: 0, validated: true }, // 40
        },
      },
    });

    const result = ranking(game);
    expect(result.map((r) => r.playerId)).toEqual(['p3', 'p1', 'p2']);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('gère les ex æquo (même rang, pas de saut trompeur)', () => {
    const game = makeGame({
      totalRounds: 1,
      rounds: {
        1: {
          p1: { bid: 1, tricks: 1, bonus: 0, validated: true }, // 20
          p2: { bid: 1, tricks: 1, bonus: 0, validated: true }, // 20
          p3: { bid: 0, tricks: 1, bonus: 0, validated: true }, // -10
        },
      },
    });

    const result = ranking(game);
    const byId = Object.fromEntries(result.map((r) => [r.playerId, r]));
    expect(byId.p1.rank).toBe(1);
    expect(byId.p2.rank).toBe(1);
    expect(byId.p3.rank).toBe(3); // le rang saute à 3, pas 2 (deux 1ers ex æquo)
  });
});

describe('tricksEnteredForRound', () => {
  it('somme les plis saisis pour avertissement de cohérence (non bloquant)', () => {
    const game = makeGame({
      rounds: {
        1: {
          p1: { bid: 1, tricks: 1, bonus: 0, validated: false },
          p2: { bid: 0, tricks: 0, bonus: 0, validated: false },
          p3: { bid: 2, tricks: 2, bonus: 0, validated: false },
        },
      },
    });

    expect(tricksEnteredForRound(game, 1)).toBe(3);
  });

  it('vaut 0 pour une manche vierge', () => {
    const game = makeGame();
    expect(tricksEnteredForRound(game, 2)).toBe(0);
  });
});
