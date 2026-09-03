// Nom de joueur mémorisé : persisté indépendamment de toute session de
// salle (contrairement à roomSession.ts, qui s'efface avec leaveRoom()) pour
// préremplir RoomScreen d'une fois sur l'autre. Sauvegardé à chaque
// création/jointure de salle, jamais à chaque frappe.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'lbc:playerName';

export async function getSavedPlayerName(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function savePlayerName(name: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, name);
}
