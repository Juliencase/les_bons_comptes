// Systèmes de score proposés à la création d'une partie — cf.
// docs/REGLES_SKULL_KING.md §4. Le calcul lui-même vit dans lib/scoring.ts ;
// ce module ne porte que le catalogue et les libellés affichés.
import { BidKind, ScoreSystem } from './types';

export type ScoreSystemDef = {
  key: ScoreSystem;
  name: string;
  tagline: string;
  description: string;
};

export const SCORE_SYSTEMS: ScoreSystemDef[] = [
  {
    key: 'skull-king',
    name: 'Skull King',
    tagline: 'classique',
    description:
      "Mise réussie : +20 pts par pli misé (+10 par carte pour une mise à 0). Mise ratée : -10 pts par pli d'écart (-10 par carte pour une mise à 0). Les bonus sont toujours acquis.",
  },
  {
    key: 'rascal',
    name: 'Rascal',
    tagline: 'équilibré',
    description:
      'Chaque manche vaut le même potentiel : 10 pts par carte distribuée. Mise exacte = 100 % du potentiel, à un pli près = 50 %, au-delà = 0. Les bonus suivent la même proportion.',
  },
];

export const DEFAULT_SCORE_SYSTEM: ScoreSystem = 'skull-king';

/** Résout un système de score par sa clé. Lève une erreur si la clé est inconnue. */
export function getScoreSystem(key: ScoreSystem): ScoreSystemDef {
  const s = SCORE_SYSTEMS.find((system) => system.key === key);
  if (!s) throw new Error(`Unknown score system: ${key}`);
  return s;
}

export type BidKindDef = {
  key: BidKind;
  name: string;
  hint: string;
};

/** Les deux types de mise de l'option Rascal « Boulet de canon » (§4.B). */
export const BID_KINDS: [BidKindDef, BidKindDef] = [
  {
    key: 'chevrotine',
    name: 'Chevrotine',
    hint: '10 pts par carte · moitié des points à un pli près',
  },
  {
    key: 'boulet',
    name: 'Boulet de canon',
    hint: '15 pts par carte, mais 0 dès que la mise est ratée',
  },
];

export function getBidKind(key: BidKind): BidKindDef {
  const k = BID_KINDS.find((kind) => kind.key === key);
  if (!k) throw new Error(`Unknown bid kind: ${key}`);
  return k;
}
