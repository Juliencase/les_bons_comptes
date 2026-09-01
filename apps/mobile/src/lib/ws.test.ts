// Tests des fonctions pures du client WS multijoueur (résolution d'URL,
// parsing d'enveloppe). Le hook useRoomSocket n'est pas testé ici : il n'y a
// pas de @testing-library/react-native dans ce repo (cf. CLAUDE.md).
import { TypeJoin } from '@lbc/shared';
import { parseEnvelope, resolveWsUrl } from './ws';

describe('resolveWsUrl', () => {
  const original = process.env.EXPO_PUBLIC_WS_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_WS_URL = original;
  });

  it("retombe sur le serveur local si la variable n'est pas définie", () => {
    delete process.env.EXPO_PUBLIC_WS_URL;
    expect(resolveWsUrl()).toBe('ws://localhost:8080/ws');
  });

  it('utilise EXPO_PUBLIC_WS_URL quand elle est définie', () => {
    process.env.EXPO_PUBLIC_WS_URL = 'wss://lbc-api.valodin.fr/ws';
    expect(resolveWsUrl()).toBe('wss://lbc-api.valodin.fr/ws');
  });
});

describe('parseEnvelope', () => {
  it('décode un message JSON bien formé', () => {
    const raw = JSON.stringify({
      type: TypeJoin,
      data: { roomCode: '1234', playerName: 'Alice' },
    });
    expect(parseEnvelope(raw)).toEqual({
      type: TypeJoin,
      data: { roomCode: '1234', playerName: 'Alice' },
    });
  });

  it('ignore un JSON invalide sans lever', () => {
    expect(parseEnvelope('{ceci-nest-pas-du-json')).toBeNull();
  });

  it("ignore une valeur qui n'a pas la forme d'une enveloppe", () => {
    expect(parseEnvelope(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });

  it("ignore une valeur qui n'est pas une chaîne", () => {
    expect(parseEnvelope(42)).toBeNull();
    expect(parseEnvelope(null)).toBeNull();
    expect(parseEnvelope(undefined)).toBeNull();
  });
});
