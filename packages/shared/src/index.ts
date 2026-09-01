// Contrat partagé entre l'app mobile et l'API.
//
// `generated/protocol.ts` est produit depuis les structs Go de
// `apps/api/internal/protocol` (`make generate`) — ne l'édite jamais à la main.
// Ce fichier-ci, lui, est écrit à la main : il ré-exporte le généré et sert de
// point d'accroche pour ce que tygo ne sait pas produire (voir plus bas).
import type { Envelope, MessageType } from './generated/protocol';

export * from './generated/protocol';

/**
 * Les types de messages que ce client sait traiter.
 *
 * Pourquoi c'est ici et pas généré : tygo traduit `type MessageType string` en
 * un simple alias de `string`, donc le TS généré n'interdit pas un type
 * inventé. Cette liste rétablit la vérification côté client — au prix d'un
 * ajout manuel à faire quand un message apparaît côté Go.
 *
 * Déclaration unique dont dérivent l'union **et** le garde : ajouter un type
 * ici suffit, il n'y a pas de second endroit qu'on pourrait oublier.
 */
export const KNOWN_MESSAGE_TYPES = [
  'join',
  'leave',
  'room_state',
  'error',
] as const;

/** Restreint le type d'un message à ceux que ce client sait traiter. */
export type KnownMessageType = (typeof KNOWN_MESSAGE_TYPES)[number];

/** Vrai si `type` fait partie des messages que ce client sait traiter. */
export function isKnownMessageType(
  type: MessageType,
): type is KnownMessageType {
  return (KNOWN_MESSAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Vérifie qu'une valeur reçue de la socket a bien la forme d'une Envelope,
 * avant tout accès à son contenu. `JSON.parse` renvoie `any` : sans ce garde,
 * TS strict ne protège plus de rien à la frontière réseau.
 *
 * Ce garde ne juge que la **forme** — discriminant présent, charge utile
 * présente. Le second filtre est `isKnownMessageType`, à appliquer ensuite :
 * une enveloppe bien formée dont le type est inconnu vient d'un serveur plus
 * récent et doit être ignorée, pas traitée comme une trame corrompue.
 */
export function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    'data' in value
  );
}
