// Tests des fonctions pures du client WS multijoueur (résolution d'URL,
// parsing d'enveloppe), et des petits modules de persistance/retry qui
// l'accompagnent (playerIdentity, reconnect). La session de salle et le nom
// mémorisé vivent désormais dans le store (voir store.test.ts) ; le hook
// useRoomSocket lui-même n'est pas testé ici : il n'y a pas de
// @testing-library/react-native dans ce repo (cf. CLAUDE.md).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TypeJoin, TypeRoomClosed } from '@lbc/shared';
import { parseEnvelope, resolveApiBaseUrl, resolveWsUrl } from './ws';
import { getOrCreatePlayerId } from './playerIdentity';
import { computeBackoffDelayMs } from './reconnect';

// AsyncStorage n'existe pas hors app : le mock officiel du package suffit,
// même pattern que store.test.ts.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory runs before ESM imports are available
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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

describe('resolveApiBaseUrl', () => {
  const original = process.env.EXPO_PUBLIC_WS_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_WS_URL = original;
  });

  it('dérive http:// depuis ws:// et retire le /ws final (défaut local)', () => {
    delete process.env.EXPO_PUBLIC_WS_URL;
    expect(resolveApiBaseUrl()).toBe('http://localhost:8080');
  });

  it('dérive https:// depuis wss://', () => {
    process.env.EXPO_PUBLIC_WS_URL = 'wss://lbc-api.valodin.fr/ws';
    expect(resolveApiBaseUrl()).toBe('https://lbc-api.valodin.fr');
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

  it('décode un message room_closed bien formé', () => {
    const raw = JSON.stringify({
      type: TypeRoomClosed,
      data: { message: 'La salle a été fermée par son créateur.' },
    });
    expect(parseEnvelope(raw)).toEqual({
      type: TypeRoomClosed,
      data: { message: 'La salle a été fermée par son créateur.' },
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

describe('getOrCreatePlayerId', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('génère un identifiant non vide', async () => {
    const id = await getOrCreatePlayerId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('retourne le même identifiant à chaque appel (persistance)', async () => {
    const first = await getOrCreatePlayerId();
    const second = await getOrCreatePlayerId();
    expect(second).toBe(first);
  });

  it('génère un identifiant différent après un stockage vidé (nouvelle installation)', async () => {
    const first = await getOrCreatePlayerId();
    await AsyncStorage.clear();
    const second = await getOrCreatePlayerId();
    expect(second).not.toBe(first);
  });
});

describe('computeBackoffDelayMs', () => {
  const originalRandom = Math.random;

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('double le délai de base à chaque tentative, jusqu’au plafond', () => {
    Math.random = () => 0; // neutralise le jitter pour isoler la progression
    expect(computeBackoffDelayMs(0)).toBe(1000);
    expect(computeBackoffDelayMs(1)).toBe(2000);
    expect(computeBackoffDelayMs(2)).toBe(4000);
    expect(computeBackoffDelayMs(3)).toBe(8000);
    expect(computeBackoffDelayMs(4)).toBe(15000); // 16000 plafonné à 15000
    expect(computeBackoffDelayMs(10)).toBe(15000); // reste plafonné au-delà
  });

  it('ajoute un jitter positif borné à 20 % du délai plafonné', () => {
    Math.random = () => 1; // pire cas : jitter maximal
    expect(computeBackoffDelayMs(0)).toBeCloseTo(1200);
    expect(computeBackoffDelayMs(4)).toBeCloseTo(18000);
  });
});
