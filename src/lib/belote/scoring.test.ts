// Tests du moteur de score Belote classique (contrat fixe à 82).
import {
  BELOTE_REBELOTE_BONUS,
  cumulativeTeamTotals,
  handTeamScores,
  isContractHeld,
  isHandComplete,
  otherTeam,
  pointsToTarget,
  teamName,
  teamRawPoints,
  winningTeamId,
} from './scoring';
import { BeloteGame, BeloteHandEntry, BeloteTeam } from './types';

const teamA: BeloteTeam = { id: 't1', players: ['Alice', 'Bob'] };
const teamB: BeloteTeam = { id: 't2', players: ['Chloé', 'David'] };
const teams: [BeloteTeam, BeloteTeam] = [teamA, teamB];

function makeHand(overrides?: Partial<BeloteHandEntry>): BeloteHandEntry {
  return {
    takerTeamId: teamA.id,
    teamAPoints: 0,
    capotTeamId: null,
    beloteRebeloteTeamId: null,
    validated: true,
    ...overrides,
  };
}

function makeGame(overrides?: Partial<BeloteGame>): BeloteGame {
  return {
    id: 'g1',
    gameKey: 'belote',
    teams,
    targetScore: 500,
    currentHand: 1,
    hands: {},
    createdAt: 0,
    ...overrides,
  };
}

describe('otherTeam', () => {
  it("retourne l'équipe adverse", () => {
    expect(otherTeam(teams, teamA.id)).toBe(teamB);
    expect(otherTeam(teams, teamB.id)).toBe(teamA);
  });
});

describe('teamName', () => {
  it('joint les deux joueurs par « & »', () => {
    expect(teamName(teamA)).toBe('Alice & Bob');
  });
});

describe('isHandComplete', () => {
  it("incomplète tant qu'aucun point n'est saisi et qu'il n'y a pas de capot", () => {
    expect(isHandComplete(makeHand({ teamAPoints: null }))).toBe(false);
  });

  it('complète dès que les points sont saisis (même 0)', () => {
    expect(isHandComplete(makeHand({ teamAPoints: 0 }))).toBe(true);
  });

  it('complète si un capot est déclaré, même sans points saisis', () => {
    expect(
      isHandComplete(makeHand({ teamAPoints: null, capotTeamId: teamA.id })),
    ).toBe(true);
  });
});

describe('teamRawPoints', () => {
  it("lit les points de l'équipe A directement, et déduit ceux de l'équipe B", () => {
    const hand = makeHand({ teamAPoints: 100 });
    expect(teamRawPoints(teams, hand, teamA.id)).toBe(100);
    expect(teamRawPoints(teams, hand, teamB.id)).toBe(62);
  });

  it('retourne null tant que les points ne sont pas saisis', () => {
    const hand = makeHand({ teamAPoints: null });
    expect(teamRawPoints(teams, hand, teamA.id)).toBeNull();
    expect(teamRawPoints(teams, hand, teamB.id)).toBeNull();
  });

  it('ne dépend pas de qui est preneur : changer le preneur ne change aucun score compté', () => {
    const hand = makeHand({ teamAPoints: 100, takerTeamId: teamA.id });
    const pointsBefore = {
      a: teamRawPoints(teams, hand, teamA.id),
      b: teamRawPoints(teams, hand, teamB.id),
    };
    const handWithOtherTaker = { ...hand, takerTeamId: teamB.id };
    expect(teamRawPoints(teams, handWithOtherTaker, teamA.id)).toBe(
      pointsBefore.a,
    );
    expect(teamRawPoints(teams, handWithOtherTaker, teamB.id)).toBe(
      pointsBefore.b,
    );
  });
});

describe('isContractHeld', () => {
  it('tenu si le preneur a strictement plus de 81 points', () => {
    expect(
      isContractHeld(
        teams,
        makeHand({ takerTeamId: teamA.id, teamAPoints: 82 }),
      ),
    ).toBe(true);
    expect(
      isContractHeld(
        teams,
        makeHand({ takerTeamId: teamA.id, teamAPoints: 81 }),
      ),
    ).toBe(false);
  });

  it('se réévalue correctement selon quelle équipe est preneuse', () => {
    // B a 162-82=80 points : si B est preneur, son contrat est raté (80 <= 81).
    const hand = makeHand({ takerTeamId: teamB.id, teamAPoints: 82 });
    expect(isContractHeld(teams, hand)).toBe(false);
  });
});

describe('handTeamScores', () => {
  it('contrat tenu : chacun garde ses points réellement comptés', () => {
    const hand = makeHand({ teamAPoints: 100 });
    expect(handTeamScores(teams, hand)).toEqual({
      [teamA.id]: 100,
      [teamB.id]: 62,
    });
  });

  it('chute (points preneur <= 81) : les 162 points vont au défenseur', () => {
    const hand = makeHand({ takerTeamId: teamA.id, teamAPoints: 81 });
    expect(handTeamScores(teams, hand)).toEqual({
      [teamA.id]: 0,
      [teamB.id]: 162,
    });
  });

  it('capot du preneur : 250 pour lui, 0 pour le défenseur', () => {
    const hand = makeHand({
      takerTeamId: teamA.id,
      teamAPoints: 162,
      capotTeamId: teamA.id,
    });
    expect(handTeamScores(teams, hand)).toEqual({
      [teamA.id]: 250,
      [teamB.id]: 0,
    });
  });

  it('capot du défenseur : 250 pour lui, 0 pour le preneur', () => {
    const hand = makeHand({
      takerTeamId: teamA.id,
      teamAPoints: 0,
      capotTeamId: teamB.id,
    });
    expect(handTeamScores(teams, hand)).toEqual({
      [teamA.id]: 0,
      [teamB.id]: 250,
    });
  });

  it('changer le preneur seul (sans toucher aux points comptés) peut faire basculer contrat/chute', () => {
    // A a 100, B a 62. A preneur avec 100 > 81 : contrat tenu.
    const heldByA = makeHand({ takerTeamId: teamA.id, teamAPoints: 100 });
    expect(handTeamScores(teams, heldByA)).toEqual({
      [teamA.id]: 100,
      [teamB.id]: 62,
    });
    // Même comptage, mais B preneur : B n'a que 62 <= 81 → chute, A empoche tout.
    const heldByB = { ...heldByA, takerTeamId: teamB.id };
    expect(handTeamScores(teams, heldByB)).toEqual({
      [teamA.id]: 162,
      [teamB.id]: 0,
    });
  });
});

describe('cumulativeTeamTotals', () => {
  it('ne compte que les manches validées', () => {
    const game = makeGame({
      hands: {
        1: makeHand({
          takerTeamId: teamA.id,
          teamAPoints: 100,
          validated: true,
        }), // A:100 B:62
        2: makeHand({
          takerTeamId: teamB.id,
          teamAPoints: 90,
          validated: false,
        }), // ignorée
      },
    });
    expect(cumulativeTeamTotals(game)).toEqual({
      [teamA.id]: 100,
      [teamB.id]: 62,
    });
  });

  it("ajoute le bonus Belote-Rebelote à l'équipe qui l'a annoncée", () => {
    const game = makeGame({
      hands: {
        1: makeHand({
          takerTeamId: teamA.id,
          teamAPoints: 40, // A preneur avec 40 <= 81 : chute, B empoche les 162
          beloteRebeloteTeamId: teamA.id,
          validated: true,
        }),
      },
    });
    expect(cumulativeTeamTotals(game)).toEqual({
      [teamA.id]: BELOTE_REBELOTE_BONUS,
      [teamB.id]: 162,
    });
  });
});

describe('pointsToTarget', () => {
  it("renvoie l'écart au score cible", () => {
    const game = makeGame({
      targetScore: 1000,
      hands: {
        1: makeHand({
          takerTeamId: teamA.id,
          teamAPoints: 100,
          validated: true,
        }),
      },
    });
    expect(pointsToTarget(game, teamA.id)).toBe(900);
    expect(pointsToTarget(game, teamB.id)).toBe(938);
  });

  it("ne descend jamais sous 0 une fois l'objectif atteint ou dépassé", () => {
    const game = makeGame({
      targetScore: 100,
      hands: {
        1: makeHand({
          takerTeamId: teamA.id,
          teamAPoints: 120,
          validated: true,
        }),
      },
    });
    expect(pointsToTarget(game, teamA.id)).toBe(0);
  });
});

describe('winningTeamId', () => {
  it("retourne null tant qu'aucune équipe n'a atteint le score cible", () => {
    const game = makeGame({
      targetScore: 500,
      hands: {
        1: makeHand({
          takerTeamId: teamA.id,
          teamAPoints: 100,
          validated: true,
        }),
      },
    });
    expect(winningTeamId(game)).toBeNull();
  });

  it("retourne l'équipe qui a atteint ou dépassé le score cible", () => {
    const game = makeGame({
      targetScore: 150,
      hands: {
        1: makeHand({
          takerTeamId: teamA.id,
          teamAPoints: 160,
          validated: true,
        }),
      },
    });
    expect(winningTeamId(game)).toBe(teamA.id);
  });

  it('si les deux équipes franchissent le seuil sur la même manche, celle avec le plus de points gagne (pas juste la première du tableau)', () => {
    // Avant la dernière manche : A=250, B=250 (score cible 300).
    // Dernière manche : B preneur, tient son contrat avec 100 pts (teamAPoints=62) →
    // A=250+62=312, B=250+100=350 : les deux dépassent 300, B (2ᵉ équipe du tableau) doit gagner.
    const game = makeGame({
      targetScore: 300,
      hands: {
        1: makeHand({
          capotTeamId: teamA.id,
          teamAPoints: null,
          validated: true,
        }), // A+=250, B+=0
        2: makeHand({
          capotTeamId: teamB.id,
          teamAPoints: null,
          validated: true,
        }), // A+=0, B+=250
        3: makeHand({
          takerTeamId: teamB.id,
          teamAPoints: 62,
          validated: true,
        }), // A+=62, B+=100
      },
    });
    expect(cumulativeTeamTotals(game)).toEqual({
      [teamA.id]: 312,
      [teamB.id]: 350,
    });
    expect(winningTeamId(game)).toBe(teamB.id);
  });
});
