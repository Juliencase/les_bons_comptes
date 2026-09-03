// Client REST minimal pour l'endpoint de debug GET /admin/rooms — pas
// d'authentification côté serveur (choix assumé, cf. CLAUDE.md racine), donc
// pas de token ici non plus.
import { AdminRoomSnapshot, AdminRoomsResponse } from '@lbc/shared';
import { resolveApiBaseUrl } from './ws';

/**
 * Récupère l'état réel des salles multijoueur persistées côté serveur.
 *
 * Contrairement à `parseEnvelope` (frontière WS, adverse par nature — un
 * message mal formé ne doit jamais planter le client), ici la réponse vient
 * de notre propre serveur, en lecture seule, pour du debug ponctuel : pas de
 * garde de forme sur le JSON décodé. Une erreur réseau ou un statut non-OK
 * est simplement propagée (throw) ; à charge de l'appelant de gérer
 * loading/erreur.
 */
export async function fetchAdminRooms(): Promise<AdminRoomSnapshot[]> {
  const response = await fetch(`${resolveApiBaseUrl()}/admin/rooms`);
  if (!response.ok) {
    throw new Error(`GET /admin/rooms a répondu ${response.status}`);
  }
  const body = (await response.json()) as AdminRoomsResponse;
  return body.rooms;
}
