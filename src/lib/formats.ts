// Formats de partie alternatifs — cf. docs/REGLES_SKULL_KING.md §2.
// Chaque format définit le nombre de cartes distribuées à chaque manche ;
// le nombre de manches se déduit de la longueur du tableau.
export type FormatDef = {
  key: string;
  name: string;
  description: string;
  cardsPerRound: number[];
};

export const FORMATS: FormatDef[] = [
  {
    key: 'standard',
    name: 'Standard',
    description: 'Le format classique : une carte de plus à chaque manche, de 1 à 10.',
    cardsPerRound: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    key: 'pas-dimpair',
    name: "Pas d'impair",
    description: 'Seulement des nombres pairs de cartes, chacun joué deux manches de suite.',
    cardsPerRound: [2, 2, 4, 4, 6, 6, 8, 8, 10, 10],
  },
  {
    key: 'pret-au-combat',
    name: 'Prêt au combat',
    description: 'Directement dans le vif : 5 manches, de 6 à 10 cartes.',
    cardsPerRound: [6, 7, 8, 9, 10],
  },
  {
    key: 'attaque-eclair',
    name: 'Attaque éclair',
    description: '5 manches rapides, toujours à 5 cartes chacune.',
    cardsPerRound: [5, 5, 5, 5, 5],
  },
  {
    key: 'tir-de-barrage',
    name: 'Tir de barrage',
    description: '10 manches intenses, toujours à 10 cartes chacune.',
    cardsPerRound: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  },
  {
    key: 'tourbillon',
    name: 'Tourbillon',
    description: 'Ça redescend par paires : 9, 9, 7, 7, 5, 5, 3, 3, 1, 1 cartes.',
    cardsPerRound: [9, 9, 7, 7, 5, 5, 3, 3, 1, 1],
  },
  {
    key: 'heure-du-dodo',
    name: "L'heure du dodo",
    description: 'Partie éclair : une seule manche, à 1 carte.',
    cardsPerRound: [1],
  },
];

export const DEFAULT_FORMAT_KEY = 'standard';

/** Résout un format par sa clé. Lève une erreur si la clé est inconnue. */
export function getFormat(key: string): FormatDef {
  const f = FORMATS.find((format) => format.key === key);
  if (!f) throw new Error(`Unknown format: ${key}`);
  return f;
}
