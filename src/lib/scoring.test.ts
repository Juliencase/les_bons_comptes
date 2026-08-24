// Tests du moteur de score Skull King — voir docs/REGLES_SKULL_KING.md §4.A (classique)
// et §4.B (Rascal).
import {
  bidKindOf,
  bidScore,
  cardsForRound,
  cumulativeTotal,
  cumulativeTotals,
  isEntryComplete,
  ranking,
  rascalOutcome,
  rascalPotential,
  rascalScore,
  roundTotal,
  tricksEnteredForRound,
} from './scoring';
import { Game, RoundEntry } from './types';

describe('cardsForRound', () => {
  it('lit le nombre de cartes de la manche dans le format de la partie', () => {
    const standard = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(cardsForRound(standard, 1)).toBe(1);
    expect(cardsForRound(standard, 7)).toBe(7);
    expect(cardsForRound(standard, 10)).toBe(10);
  });

  it("suit le format personnalisé plutôt que le n° de manche", () => {
    expect(cardsForRound([6, 7, 8, 9, 10], 1)).toBe(6);
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

describe('bidKindOf', () => {
  it('vaut chevrotine par défaut (parties classiques / d\'avant l\'option)', () => {
    expect(bidKindOf({ bid: 1, tricks: 1, bonus: 0, validated: false })).toBe('chevrotine');
  });

  it('respecte le type de mise saisi', () => {
    expect(
      bidKindOf({ bid: 1, tricks: 1, bonus: 0, bidKind: 'boulet', validated: false }),
    ).toBe('boulet');
  });
});

describe('rascalOutcome', () => {
  it('écart 0 → coup direct', () => {
    expect(rascalOutcome(3, 3, 'chevrotine')).toBe('direct');
    expect(rascalOutcome(0, 0, 'boulet')).toBe('direct');
  });

  it('écart 1 en chevrotine → frappe à revers', () => {
    expect(rascalOutcome(3, 4, 'chevrotine')).toBe('graze');
    expect(rascalOutcome(3, 2, 'chevrotine')).toBe('graze');
  });

  it('écart 1 en boulet de canon → échec (pas de demi-points)', () => {
    expect(rascalOutcome(3, 4, 'boulet')).toBe('miss');
  });

  it('écart ≥ 2 → échec cuisant', () => {
    expect(rascalOutcome(1, 4, 'chevrotine')).toBe('miss');
  });
});

describe('rascalPotential', () => {
  it('chevrotine : 10 pts par carte distribuée', () => {
    expect(rascalPotential(5, 'chevrotine')).toBe(50);
  });

  it('boulet de canon : 15 pts par carte distribuée', () => {
    expect(rascalPotential(5, 'boulet')).toBe(75);
  });
});

describe('rascalScore', () => {
  it('coup direct : 100 % du potentiel', () => {
    expect(rascalScore(3, 3, 5, 'chevrotine', 0)).toBe(50);
  });

  it('frappe à revers : 50 % du potentiel', () => {
    expect(rascalScore(3, 4, 5, 'chevrotine', 0)).toBe(25);
  });

  it('échec cuisant : 0 point', () => {
    expect(rascalScore(1, 4, 5, 'chevrotine', 0)).toBe(0);
  });

  it('le potentiel suit les cartes distribuées, pas la mise', () => {
    // Une mise à 0 réussie vaut autant qu'une mise à 3 réussie : c'est le
    // principe du système équilibré.
    expect(rascalScore(0, 0, 7, 'chevrotine', 0)).toBe(70);
    expect(rascalScore(3, 3, 7, 'chevrotine', 0)).toBe(70);
  });

  it('les bonus sont acquis en entier sur un coup direct', () => {
    expect(rascalScore(3, 3, 5, 'chevrotine', 20)).toBe(70);
  });

  it('les bonus sont pondérés à 50 % sur une frappe à revers, arrondis au supérieur', () => {
    // base 50 + bonus 5 (carte 8) = 55 → ceil(55 / 2) = 28, en faveur du joueur.
    expect(rascalScore(3, 4, 5, 'chevrotine', 5)).toBe(28);
  });

  it('arrondit aussi au supérieur sur un total négatif (§4.B)', () => {
    // base 10 + bonus -15 = -5 → ceil(-2,5) = -2.
    expect(rascalScore(1, 2, 1, 'chevrotine', -15)).toBe(-2);
  });

  it('un échec cuisant annule aussi les bonus', () => {
    expect(rascalScore(1, 4, 5, 'chevrotine', 40)).toBe(0);
  });

  it('boulet de canon réussi : 15 par carte + bonus entiers', () => {
    expect(rascalScore(2, 2, 6, 'boulet', 20)).toBe(110);
  });

  it('boulet de canon raté : 0, bonus compris, même à un pli près', () => {
    expect(rascalScore(2, 3, 6, 'boulet', 20)).toBe(0);
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
    expect(roundTotal(undefined, 5, 'skull-king')).toBe(0);
    expect(
      roundTotal({ bid: null, tricks: null, bonus: 0, validated: false }, 5, 'skull-king'),
    ).toBe(0);
  });

  it('additionne le score de mise et le bonus (système classique)', () => {
    const entry: RoundEntry = { bid: 3, tricks: 3, bonus: 10, validated: true };
    expect(roundTotal(entry, 5, 'skull-king')).toBe(60 + 10);
  });

  it('le bonus peut être négatif (ex. carte 7 de l\'extension)', () => {
    const entry: RoundEntry = { bid: 1, tricks: 1, bonus: -5, validated: true };
    expect(roundTotal(entry, 3, 'skull-king')).toBe(20 - 5);
  });

  it('applique le système Rascal quand la partie le demande', () => {
    const entry: RoundEntry = { bid: 3, tricks: 4, bonus: 0, validated: true };
    // Même saisie : -10 en classique (1 pli d'écart), 50 % du potentiel en Rascal.
    expect(roundTotal(entry, 5, 'skull-king')).toBe(-10);
    expect(roundTotal(entry, 5, 'rascal')).toBe(25);
  });

  it('respecte le type de mise de l\'entrée en Rascal', () => {
    const entry: RoundEntry = {
      bid: 2,
      tricks: 2,
      bonus: 0,
      bidKind: 'boulet',
      validated: true,
    };
    expect(roundTotal(entry, 6, 'rascal')).toBe(90);
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
    cardsPerRound: [1, 2, 3],
    scoreSystem: 'skull-king',
    cannonballRule: false,
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

  it('cumule selon le système de score de la partie (Rascal)', () => {
    const game = makeGame({
      scoreSystem: 'rascal',
      cannonballRule: true,
      cardsPerRound: [2, 4],
      rounds: {
        1: {
          // 2 cartes : coup direct en chevrotine → 20
          p1: { bid: 1, tricks: 1, bonus: 0, validated: true },
          // frappe à revers → ceil(20 / 2) = 10
          p2: { bid: 0, tricks: 1, bonus: 0, validated: true },
        },
        2: {
          // 4 cartes : boulet de canon réussi → 60
          p1: { bid: 2, tricks: 2, bonus: 0, bidKind: 'boulet', validated: true },
          // boulet de canon raté d'un pli → 0
          p2: { bid: 2, tricks: 3, bonus: 30, bidKind: 'boulet', validated: true },
        },
      },
    });

    expect(cumulativeTotal(game, 'p1')).toBe(20 + 60);
    expect(cumulativeTotal(game, 'p2')).toBe(10);
  });
});

describe('ranking', () => {
  it('classe par total décroissant', () => {
    const game = makeGame({
      cardsPerRound: [1],
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
      cardsPerRound: [1],
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
