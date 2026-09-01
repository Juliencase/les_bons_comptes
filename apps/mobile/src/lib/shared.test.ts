// Tests du contrat partagé (`@lbc/shared`), lancés depuis l'app parce que c'est
// elle qui le consomme. Ils couvrent les deux gardes de la frontière réseau et,
// au passage, vérifient que le package — publié en TypeScript source, sans
// étape de build — traverse bien la résolution monorepo et le transformeur de
// Jest. Si ce fichier casse dès l'import, c'est cette plomberie-là qui a bougé,
// pas la logique testée en dessous.
import {
  isEnvelope,
  isKnownMessageType,
  KNOWN_MESSAGE_TYPES,
  TypeError as TypeErrorMessage,
  TypeJoin,
  TypeLeave,
  TypeRoomState,
  Version,
} from '@lbc/shared';

describe('contrat partagé', () => {
  it('expose la version de protocole générée depuis le Go', () => {
    expect(typeof Version).toBe('number');
    expect(Version).toBeGreaterThanOrEqual(1);
  });

  // Garde anti-dérive : tygo aplatit `type MessageType string` en `string`, donc
  // rien côté TS ne relie les constantes générées à la liste tenue à la main.
  it('connaît tous les types de messages définis côté Go', () => {
    for (const type of [TypeJoin, TypeLeave, TypeRoomState, TypeErrorMessage]) {
      expect(isKnownMessageType(type)).toBe(true);
    }
    expect(KNOWN_MESSAGE_TYPES).toHaveLength(4);
  });

  it('rejette un type de message inventé', () => {
    expect(isKnownMessageType('deal_cards')).toBe(false);
    expect(isKnownMessageType('')).toBe(false);
  });
});

describe('isEnvelope', () => {
  it('accepte une enveloppe bien formée', () => {
    expect(isEnvelope({ type: TypeJoin, data: null })).toBe(true);
    expect(isEnvelope({ type: TypeRoomState, data: { room: {} } })).toBe(true);
  });

  it('rejette tout ce qui ne peut pas être lu comme une enveloppe', () => {
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope(undefined)).toBe(false);
    expect(isEnvelope('join')).toBe(false);
    expect(isEnvelope(42)).toBe(false);
    expect(isEnvelope({})).toBe(false);
    expect(isEnvelope({ type: 42, data: null })).toBe(false);
    // Discriminant sans charge utile : le second décodage n'aurait rien à lire.
    expect(isEnvelope({ type: TypeJoin })).toBe(false);
  });

  // Deux filtres distincts, à appliquer dans cet ordre : une enveloppe d'un
  // serveur plus récent est bien formée, elle doit être ignorée et non traitée
  // comme une trame corrompue.
  it('laisse passer un type inconnu, que isKnownMessageType filtre ensuite', () => {
    const frame = { type: 'deal_cards', data: null };
    expect(isEnvelope(frame)).toBe(true);
    expect(isKnownMessageType(frame.type)).toBe(false);
  });
});
