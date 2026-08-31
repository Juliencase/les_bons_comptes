// Tests des utilitaires de noms de joueurs.
import { finalizePlayerNames, joinNames } from './names';

describe('finalizePlayerNames', () => {
  it("remplace les champs vides par un libellé indexé sans changer l'ordre", () => {
    expect(finalizePlayerNames(['Alice', '  ', 'Chloé'], 'Joueur')).toEqual([
      'Alice',
      'Joueur 2',
      'Chloé',
    ]);
  });

  it('nettoie les espaces autour des noms saisis', () => {
    expect(finalizePlayerNames(['  Bob  '], 'Joueur')).toEqual(['Bob']);
  });
});

describe('joinNames', () => {
  it('rend un seul nom tel quel', () => {
    expect(joinNames(['Alice'])).toBe('Alice');
  });

  it('relie deux noms par « & »', () => {
    expect(joinNames(['Alice', 'Bob'])).toBe('Alice & Bob');
  });

  it('énumère au-delà de deux : virgules puis « & » pour le dernier', () => {
    expect(joinNames(['Alice', 'Bob', 'Chloé'])).toBe('Alice, Bob & Chloé');
    expect(joinNames(['Alice', 'Bob', 'Chloé', 'David'])).toBe(
      'Alice, Bob, Chloé & David',
    );
  });

  it('rend une chaîne vide sans nom (aucun lauréat à afficher)', () => {
    expect(joinNames([])).toBe('');
  });
});
