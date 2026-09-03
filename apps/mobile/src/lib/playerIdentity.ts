// Identifiant client persistant, distinct de l'ID de connexion attribué par
// le hub à chaque socket : généré une seule fois par installation, il permet
// à terme au hub de reconnaître une reconnexion comme le même joueur plutôt
// que comme un nouvel arrivant (voir CreatePayload/JoinPayload dans
// @lbc/shared — le hub ne l'exploite pas encore, cf. apps/api/CLAUDE.md).
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'lbc:playerId';

/**
 * Identifiant opaque, unique et stable une fois généré — pas besoin d'un
 * vrai UUID RFC4122 pour cet usage, et aucune dépendance uuid/expo-crypto
 * n'est présente dans le monorepo pour en fabriquer un.
 */
function generatePlayerId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Retourne le playerId de cette installation, en le générant et le
 * persistant au tout premier appel.
 */
export async function getOrCreatePlayerId(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const generated = generatePlayerId();
  await AsyncStorage.setItem(STORAGE_KEY, generated);
  return generated;
}
