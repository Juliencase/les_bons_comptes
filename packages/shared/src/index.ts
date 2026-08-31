// Contrat partagé entre l'app mobile et l'API.
//
// `generated/protocol.ts` est produit depuis les structs Go de
// `apps/api/internal/protocol` (`make generate`) — ne l'édite jamais à la main.
// Ce fichier-ci, lui, est écrit à la main : il ré-exporte le généré et sert de
// point d'accroche pour ce que tygo ne sait pas produire (voir plus bas).
import type { Envelope, MessageType } from './generated/protocol';

export * from './generated/protocol';

/**
 * Restreint le type d'un message.
 *
 * Pourquoi c'est ici et pas généré : tygo traduit `type MessageType string` en
 * un simple alias de `string`, donc le TS généré n'interdit pas un type
 * inventé. Cette union rétablit la vérification côté client — au prix d'un
 * ajout manuel à faire quand un message apparaît côté Go.
 */
export type KnownMessageType =
  | 'join'
  | 'leave'
  | 'room_state'
  | 'error';

/** Vrai si `type` fait partie des messages que ce client sait traiter. */
export function isKnownMessageType(
  type: MessageType,
): type is KnownMessageType {
  return (
    type === 'join' ||
    type === 'leave' ||
    type === 'room_state' ||
    type === 'error'
  );
}

/**
 * Vérifie qu'une valeur reçue de la socket a bien la forme d'une Envelope,
 * avant tout accès à son contenu. `JSON.parse` renvoie `any` : sans ce garde,
 * TS strict ne protège plus de rien à la frontière réseau.
 */
export function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}
