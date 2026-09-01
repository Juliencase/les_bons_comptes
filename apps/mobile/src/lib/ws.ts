// Client WebSocket minimal pour parler au serveur multijoueur (apps/api).
// Pas de dépendance externe : le WebSocket natif de React Native /
// react-native-web suffit pour la poignée de messages JSON échangés ici.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CreatePayload,
  Envelope,
  ErrorPayload,
  isEnvelope,
  isKnownMessageType,
  Room,
  RoomStatePayload,
  TypeCreate,
  TypeError as TypeErrorMessage,
  TypeRoomState,
} from '@lbc/shared';

const DEFAULT_WS_URL = 'ws://localhost:8080/ws';

/**
 * Résout l'URL du serveur WS. Expo n'inline dans le bundle que les variables
 * préfixées `EXPO_PUBLIC_` — celle-ci doit être définie au build pour un
 * déploiement réel. Sans elle (dev local), `make dev-api` écoute sur :8080.
 */
export function resolveWsUrl(): string {
  return process.env.EXPO_PUBLIC_WS_URL ?? DEFAULT_WS_URL;
}

/**
 * Décode un message brut reçu de la socket en Envelope, sans jamais lever :
 * un message mal formé (JSON invalide, ou valide mais pas une enveloppe) est
 * ignoré silencieusement — la frontière réseau ne doit pas planter le client.
 */
export function parseEnvelope(raw: unknown): Envelope | null {
  if (typeof raw !== 'string') return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return isEnvelope(value) ? value : null;
}

export type RoomConnectionStatus =
  'idle' | 'connecting' | 'connected' | 'error';

type RoomSocketState = {
  status: RoomConnectionStatus;
  room: Room | null;
  errorMessage: string | null;
};

const IDLE_STATE: RoomSocketState = {
  status: 'idle',
  room: null,
  errorMessage: null,
};

// Message affiché à l'utilisateur : jamais le détail technique (code réseau,
// raison de fermeture...), qui n'aiderait personne autour d'une table de jeu.
const CONNECTION_FAILED_MESSAGE =
  'Connexion au serveur impossible. Vérifiez le réseau et réessayez.';

/**
 * Ouvre une connexion au serveur multijoueur, crée une salle, et expose son
 * état au composant appelant (`idle` → `connecting` → `connected`/`error`).
 * Un seul socket vit à la fois : rappeler `createRoom` referme silencieusement
 * une tentative précédente.
 */
export function useRoomSocket() {
  const [state, setState] = useState<RoomSocketState>(IDLE_STATE);
  const socketRef = useRef<WebSocket | null>(null);

  const closeSocket = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const createRoom = useCallback(
    (playerName: string) => {
      closeSocket();
      setState({ status: 'connecting', room: null, errorMessage: null });

      const socket = new WebSocket(resolveWsUrl());
      socketRef.current = socket;
      // Un nouvel essai remplace `socketRef.current` : ce garde évite qu'un
      // événement tardif de l'ancien socket (fermeture, erreur) n'écrase
      // l'état du nouvel essai en cours.
      const isCurrent = () => socketRef.current === socket;

      socket.onopen = () => {
        if (!isCurrent()) return;
        const payload: CreatePayload = { playerName };
        const envelope: Envelope = { type: TypeCreate, data: payload };
        socket.send(JSON.stringify(envelope));
      };

      socket.onmessage = (event) => {
        if (!isCurrent()) return;
        const envelope = parseEnvelope(event.data);
        // Type mal formé ou inconnu (serveur plus récent) : on ignore.
        if (!envelope || !isKnownMessageType(envelope.type)) return;

        // `isEnvelope` ne garantit que la présence de `data`, pas sa forme :
        // un `data` absent/nul (ex. côté Go, un `json.RawMessage` non défini)
        // doit être traité comme un message mal formé, jamais déstructuré tel
        // quel.
        if (envelope.type === TypeRoomState) {
          const payload = envelope.data as RoomStatePayload | null;
          if (!payload?.room) return;
          setState({ status: 'connected', room: payload.room, errorMessage: null });
        } else if (envelope.type === TypeErrorMessage) {
          const payload = envelope.data as ErrorPayload | null;
          setState({
            status: 'error',
            room: null,
            errorMessage: payload?.message || CONNECTION_FAILED_MESSAGE,
          });
        }
      };

      socket.onerror = () => {
        if (!isCurrent()) return;
        setState({
          status: 'error',
          room: null,
          errorMessage: CONNECTION_FAILED_MESSAGE,
        });
      };

      socket.onclose = () => {
        if (!isCurrent()) return;
        socketRef.current = null;
        // Le hub Go (apps/api/internal/hub) n'est pas encore implémenté : il
        // ferme aujourd'hui toute connexion entrante, donc une fermeture avant
        // qu'une salle ait été créée est l'échec attendu, pas une fermeture
        // propre après usage — on ne touche pas à un état déjà `connected`.
        setState((prev) =>
          prev.status === 'connected'
            ? prev
            : {
                status: 'error',
                room: null,
                errorMessage: CONNECTION_FAILED_MESSAGE,
              },
        );
      };
    },
    [closeSocket],
  );

  const reset = useCallback(() => {
    closeSocket();
    setState(IDLE_STATE);
  }, [closeSocket]);

  // Ferme le socket si l'écran est démonté pendant une connexion (pas de fuite).
  useEffect(() => {
    return () => closeSocket();
  }, [closeSocket]);

  return { ...state, createRoom, reset };
}
