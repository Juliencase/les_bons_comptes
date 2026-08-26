// Tests du palmarès de fin de partie (titres décernés sur les manches validées).
import { Award, AwardKey, awards, playerStats } from './stats';
import { Game } from './types';

function makeGame(overrides?: Partial<Game>): Game {
  return {
    id: 'g1',
    gameKey: 'skull-king',
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Chloé' },
    ],
    cardsPerRound: [2, 3, 4],
    scoreSystem: 'skull-king',
    cannonballRule: false,
    currentRound: 3,
    rounds: {},
    createdAt: 0,
    ...overrides,
  };
}

/**
 * Partie de référence, 3 joueurs sur 3 manches :
 * - Alice remporte le plus de plis (6) et mise juste 2 fois, avec un malus de 5 ;
 * - Bob ne remporte aucun pli des 3 manches, mise juste 2 fois, +20 de bonus ;
 * - Chloé rate ses 3 mises à un pli près, avec 10 de bonus et 15 de malus.
 */
function referenceGame(): Game {
  return makeGame({
    rounds: {
      1: {
        p1: { bid: 1, tricks: 1, bonus: 0, validated: true },
        p2: { bid: 0, tricks: 0, bonus: 20, validated: true },
        p3: { bid: 2, tricks: 1, bonus: 0, validated: true },
      },
      2: {
        p1: { bid: 2, tricks: 2, bonus: -5, validated: true },
        p2: { bid: 1, tricks: 0, bonus: 0, validated: true },
        p3: { bid: 0, tricks: 1, bonus: 10, validated: true },
      },
      3: {
        p1: { bid: 1, tricks: 3, bonus: 0, validated: true },
        p2: { bid: 0, tricks: 0, bonus: 0, validated: true },
        p3: { bid: 2, tricks: 1, bonus: -15, validated: true },
      },
    },
  });
}

/** Le titre demandé, ou undefined s'il n'a pas été décerné. */
function awardOf(list: Award[], key: AwardKey): Award | undefined {
  return list.find((a) => a.key === key);
}

describe('playerStats', () => {
  it('agrège plis, mises exactes, presque, bonus et malus', () => {
    const stats = playerStats(referenceGame());
    const byId = Object.fromEntries(stats.map((s) => [s.playerId, s]));

    expect(byId.p1).toEqual({
      playerId: 'p1',
      roundsPlayed: 3,
      tricks: 6,
      emptyRounds: 0,
      exactBids: 2,
      nearMisses: 0,
      bonusGained: 0,
      malusTaken: 5,
    });
    expect(byId.p2).toMatchObject({
      tricks: 0,
      emptyRounds: 3,
      exactBids: 2,
      bonusGained: 20,
    });
    expect(byId.p3).toMatchObject({
      tricks: 3,
      nearMisses: 3,
      bonusGained: 10,
      malusTaken: 15,
    });
  });

  it('ignore les manches non validées ou incomplètes', () => {
    const game = makeGame({
      rounds: {
        1: { p1: { bid: 1, tricks: 1, bonus: 10, validated: true } },
        // saisie en cours : ne doit rien ajouter aux compteurs
        2: { p1: { bid: 3, tricks: 3, bonus: 50, validated: false } },
        // validée mais incomplète (plis jamais saisis)
        3: { p1: { bid: 2, tricks: null, bonus: 30, validated: true } },
      },
    });

    const [alice] = playerStats(game);
    expect(alice).toMatchObject({
      roundsPlayed: 1,
      tricks: 1,
      exactBids: 1,
      bonusGained: 10,
    });
  });

  it('ne compte le malus que sur les manches à bonus négatif', () => {
    // Le bonus est un net par manche : +20 puis -5 sur la même manche ne se
    // sépare pas, la manche compte pour +15 de bonus et zéro malus.
    const game = makeGame({
      cardsPerRound: [2],
      rounds: { 1: { p1: { bid: 1, tricks: 1, bonus: 15, validated: true } } },
    });

    expect(playerStats(game)[0]).toMatchObject({
      bonusGained: 15,
      malusTaken: 0,
    });
  });
});

describe('awards', () => {
  it('décerne les sept titres et les rend dans un ordre stable', () => {
    expect(awards(referenceGame()).map((a) => a.key)).toEqual([
      'loup-de-mer',
      'marin-eau-douce',
      'parieur-fou',
      'presque',
      'chasseur-tresor',
      'maudit',
      'fantome',
    ]);
  });

  it('désigne le bon lauréat pour chaque titre, avec le chiffre qui le justifie', () => {
    const list = awards(referenceGame());

    expect(awardOf(list, 'loup-de-mer')).toMatchObject({
      playerIds: ['p1'],
      detail: '6 plis remportés',
    });
    expect(awardOf(list, 'marin-eau-douce')).toMatchObject({
      playerIds: ['p2'],
      detail: 'pas le moindre pli de toute la partie',
    });
    expect(awardOf(list, 'presque')).toMatchObject({
      playerIds: ['p3'],
      detail: '3 manches ratées à un pli près',
    });
    expect(awardOf(list, 'chasseur-tresor')).toMatchObject({
      playerIds: ['p2'],
      detail: '+20 pts de bonus',
    });
    expect(awardOf(list, 'maudit')).toMatchObject({
      playerIds: ['p3'],
      detail: '-15 pts de malus',
    });
    expect(awardOf(list, 'fantome')).toMatchObject({
      playerIds: ['p2'],
      detail: '3 manches sans le moindre pli',
    });
  });

  it('partage un titre entre les ex æquo', () => {
    // Alice et Bob ont chacun 2 mises exactes sur 3.
    expect(awardOf(awards(referenceGame()), 'parieur-fou')).toMatchObject({
      playerIds: ['p1', 'p2'],
      detail: '2 mises exactes sur 3',
    });
  });

  it('accorde les libellés au singulier', () => {
    const game = makeGame({
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      cardsPerRound: [1, 1],
      rounds: {
        1: {
          p1: { bid: 1, tricks: 1, bonus: 0, validated: true },
          p2: { bid: 0, tricks: 0, bonus: 0, validated: true },
        },
        2: {
          p1: { bid: 0, tricks: 0, bonus: 0, validated: true },
          p2: { bid: 1, tricks: 0, bonus: 0, validated: true },
        },
      },
    });

    const list = awards(game);
    expect(awardOf(list, 'loup-de-mer')?.detail).toBe('1 pli remporté');
    expect(awardOf(list, 'presque')?.detail).toBe(
      '1 manche ratée à un pli près',
    );
  });

  it('ne décerne rien quand personne ne se distingue', () => {
    // Deux joueurs, une manche, exactement le même résultat : aucun titre.
    const game = makeGame({
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      cardsPerRound: [2],
      rounds: {
        1: {
          p1: { bid: 1, tricks: 1, bonus: 0, validated: true },
          p2: { bid: 1, tricks: 1, bonus: 0, validated: true },
        },
      },
    });

    expect(awards(game)).toEqual([]);
  });

  it('saute les titres à zéro : pas de Maudit sans malus', () => {
    const game = makeGame({
      cardsPerRound: [2, 2],
      rounds: {
        1: {
          p1: { bid: 1, tricks: 2, bonus: 0, validated: true },
          p2: { bid: 1, tricks: 0, bonus: 10, validated: true },
          p3: { bid: 0, tricks: 0, bonus: 0, validated: true },
        },
        2: {
          p1: { bid: 2, tricks: 2, bonus: 0, validated: true },
          p2: { bid: 0, tricks: 0, bonus: 0, validated: true },
          p3: { bid: 1, tricks: 0, bonus: 0, validated: true },
        },
      },
    });

    const list = awards(game);
    expect(awardOf(list, 'maudit')).toBeUndefined();
    expect(awardOf(list, 'chasseur-tresor')).toMatchObject({
      playerIds: ['p2'],
    });
  });

  it('ne décerne aucun titre sur une partie vierge', () => {
    expect(awards(makeGame())).toEqual([]);
  });

  it('laisse un même joueur cumuler plusieurs titres', () => {
    const list = awards(referenceGame());
    const bobTitles = list
      .filter((a) => a.playerIds.includes('p2'))
      .map((a) => a.key);

    expect(bobTitles).toEqual(
      expect.arrayContaining([
        'marin-eau-douce',
        'parieur-fou',
        'chasseur-tresor',
        'fantome',
      ]),
    );
  });
});

describe('bonus selon le système de score', () => {
  /** Les agrégats d'une partie, indexés par joueur. */
  function statsById(game: Game) {
    return Object.fromEntries(playerStats(game).map((s) => [s.playerId, s]));
  }

  it("ne compte pas le bonus d'une manche Rascal qui n'a rien rapporté", () => {
    const game = makeGame({
      scoreSystem: 'rascal',
      cardsPerRound: [3],
      rounds: {
        1: {
          // échec cuisant : la manche vaut 0, bonus compris
          p1: { bid: 1, tricks: 3, bonus: 40, validated: true },
          // coup direct : bonus acquis en entier
          p2: { bid: 1, tricks: 1, bonus: 10, validated: true },
          // frappe à revers : la manche marque, le bonus compte
          p3: { bid: 1, tricks: 2, bonus: 20, validated: true },
        },
      },
    });

    const byId = statsById(game);
    expect(byId.p1.bonusGained).toBe(0);
    expect(byId.p2.bonusGained).toBe(10);
    expect(byId.p3.bonusGained).toBe(20);
  });

  it("ignore de même le malus d'une manche Rascal à zéro", () => {
    const game = makeGame({
      scoreSystem: 'rascal',
      cardsPerRound: [3],
      rounds: {
        1: {
          p1: { bid: 0, tricks: 3, bonus: -15, validated: true }, // miss
          p2: { bid: 1, tricks: 1, bonus: -5, validated: true }, // direct
          p3: { bid: 1, tricks: 1, bonus: 0, validated: true },
        },
      },
    });

    const byId = statsById(game);
    expect(byId.p1.malusTaken).toBe(0);
    expect(byId.p2.malusTaken).toBe(5);
    // Le titre suit : c'est Bob le maudit, pas Alice.
    expect(awards(game).find((a) => a.key === 'maudit')).toMatchObject({
      playerIds: ['p2'],
      detail: '-5 pts de malus',
    });
  });

  it("un boulet de canon raté n'emporte pas non plus ses bonus", () => {
    const game = makeGame({
      scoreSystem: 'rascal',
      cannonballRule: true,
      cardsPerRound: [4],
      rounds: {
        1: {
          // raté d'un seul pli : en boulet, tout est perdu
          p1: {
            bid: 2,
            tricks: 3,
            bonus: 30,
            validated: true,
            bidKind: 'boulet',
          },
          p2: {
            bid: 2,
            tricks: 2,
            bonus: 30,
            validated: true,
            bidKind: 'boulet',
          },
          p3: { bid: 1, tricks: 1, bonus: 0, validated: true },
        },
      },
    });

    const byId = statsById(game);
    expect(byId.p1.bonusGained).toBe(0);
    expect(byId.p2.bonusGained).toBe(30);
  });

  it('compte tous les bonus en système classique, mise ratée ou non', () => {
    const game = makeGame({
      cardsPerRound: [3],
      rounds: {
        1: {
          // mise ratée de deux plis : en classique le bonus reste acquis (§5)
          p1: { bid: 1, tricks: 3, bonus: 40, validated: true },
          p2: { bid: 1, tricks: 1, bonus: 0, validated: true },
          p3: { bid: 1, tricks: 1, bonus: -10, validated: true },
        },
      },
    });

    const byId = statsById(game);
    expect(byId.p1.bonusGained).toBe(40);
    expect(byId.p3.malusTaken).toBe(10);
  });
});
