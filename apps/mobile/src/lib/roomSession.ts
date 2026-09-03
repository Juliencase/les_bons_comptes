// Session de room persistée : { roomCode, playerName } sauvegardés dès qu'une
// connexion aboutit, pour proposer une reprise automatique si RoomScreen
// remonte plus tard (app relancée après une coupure prolongée) plutôt que
// d'afficher le formulaire vide. Effacée par un leaveRoom() explicite — le
// playerId (src/lib/playerIdentity.ts) n'en fait pas partie : il reste stable
// pour la vie de l'app, indépendamment d'une session de room donnée.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'lbc:roomSession';

export type RoomSession = {
  roomCode: string;
  playerName: string;
};

function isRoomSession(value: unknown): value is RoomSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RoomSession).roomCode === 'string' &&
    typeof (value as RoomSession).playerName === 'string'
  );
}

export async function saveRoomSession(session: RoomSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Lit la session persistée. Ne lève jamais : un contenu absent ou corrompu
 * (JSON invalide, forme inattendue) est traité comme « pas de session ».
 */
export async function loadRoomSession(): Promise<RoomSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return isRoomSession(value) ? value : null;
}

export async function clearRoomSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
