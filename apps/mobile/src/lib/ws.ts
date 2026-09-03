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
  JoinPayload,
  Room,
  RoomStatePayload,
  TypeCreate,
  TypeError as TypeErrorMessage,
  TypeJoin,
  TypeRoomState,
} from '@lbc/shared';
import { getOrCreatePlayerId } from './playerIdentity';
import { computeBackoffDelayMs } from './reconnect';
import { clearRoomSession, loadRoomSession, saveRoomSession } from './roomSession';

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
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

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

// Ce que le hook garde en mémoire pour rejouer un `join` identique lors d'une
// reconnexion — que la connexion d'origine ait été un `create` ou un `join`,
// un retry est toujours un `join` vers la salle déjà rejointe (voir `connect`
// plus bas). `roomCode` vaut '' tant que le serveur ne l'a pas confirmé (juste
// après un `create`, avant la toute première `room_state`).
type PendingSession = {
  roomCode: string;
  playerName: string;
  playerId: string;
};

function buildJoinEnvelope(session: PendingSession): Envelope {
  const payload: JoinPayload = {
    roomCode: session.roomCode,
    playerName: session.playerName,
    playerId: session.playerId,
  };
  return { type: TypeJoin, data: payload };
}

/**
 * Ouvre une connexion au serveur multijoueur et expose son état au composant
 * appelant (`idle` → `connecting` → `connected`/`error`, avec un
 * `reconnecting` intercalé lors d'une coupure après connexion). Un seul
 * socket vit à la fois : rappeler `createRoom`/`joinRoom` referme
 * silencieusement une tentative précédente.
 *
 * Une fermeture inattendue (ni `leaveRoom()`, ni un nouvel appel
 * `createRoom`/`joinRoom`) survenant après un `connected`, ou pendant une
 * reconnexion déjà en cours, programme un nouvel essai avec un backoff
 * exponentiel plafonné (`computeBackoffDelayMs`) — indéfiniment tant que le
 * composant reste monté. Comme le hub Go n'exploite pas encore `playerId`
 * (voir `packages/shared/src/generated/protocol.ts`), une reconnexion
 * recrée côté serveur un nouveau joueur dans la salle : compromis accepté
 * pour cette phase, pas de tentative de le masquer côté client.
 */
export function useRoomSocket() {
  const [state, setState] = useState<RoomSocketState>(IDLE_STATE);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  // Session courante, ou `null` hors de toute salle (état initial, ou après
  // `leaveRoom()`) : sa présence est ce qui autorise un retry automatique.
  const sessionRef = useRef<PendingSession | null>(null);
  // Incrémenté à chaque nouvelle tentative pour invalider la résolution
  // asynchrone du playerId d'un appel devenu obsolète (createRoom/joinRoom
  // rappelé, ou leaveRoom, avant que `getOrCreatePlayerId` ait répondu).
  const requestIdRef = useRef(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  // Ouvre un socket et branche ses gestionnaires ; `buildOutbound` construit
  // le message envoyé une fois la connexion établie. Dépendances vides à
  // dessein : tout ce dont la fonction a besoin (refs, `setState`, imports de
  // module) est stable, ce qui permet à `onclose` de se reprogrammer
  // elle-même (via `connect`, capturé par closure) sans dépendance circulaire
  // avec un `scheduleReconnect` séparé.
  const connect = useCallback((buildOutbound: () => Envelope) => {
    const socket = new WebSocket(resolveWsUrl());
    socketRef.current = socket;
    // Un nouvel essai remplace `socketRef.current` : ce garde évite qu'un
    // événement tardif de l'ancien socket (fermeture, erreur) n'écrase
    // l'état du nouvel essai en cours.
    const isCurrent = () => socketRef.current === socket;

    socket.onopen = () => {
      if (!isCurrent()) return;
      socket.send(JSON.stringify(buildOutbound()));
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
        reconnectAttemptRef.current = 0;
        const session = sessionRef.current;
        if (session) {
          sessionRef.current = { ...session, roomCode: payload.room.code };
          void saveRoomSession({
            roomCode: payload.room.code,
            playerName: session.playerName,
          });
        }
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

    socket.onclose = () => {
      if (!isCurrent()) return;
      socketRef.current = null;

      const session = sessionRef.current;
      setState((prev) => {
        // Fermeture avant toute connexion établie (ou après une salle déjà
        // quittée) : l'échec attendu, pas de retry. On ne retente que si on
        // connaît la salle à rejoindre (session non nulle) et qu'on était
        // déjà connecté, ou déjà en train de retenter.
        const shouldRetry =
          session != null &&
          (prev.status === 'connected' || prev.status === 'reconnecting');
        if (!shouldRetry) {
          return {
            status: 'error',
            room: null,
            errorMessage: CONNECTION_FAILED_MESSAGE,
          };
        }

        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect(() => buildJoinEnvelope(session));
        }, computeBackoffDelayMs(attempt));

        return { status: 'reconnecting', room: prev.room, errorMessage: null };
      });
    };
  }, []);

  const createRoom = useCallback(
    (playerName: string) => {
      clearReconnectTimer();
      closeSocket();
      reconnectAttemptRef.current = 0;
      setState({ status: 'connecting', room: null, errorMessage: null });

      const requestId = ++requestIdRef.current;
      void getOrCreatePlayerId().then((playerId) => {
        // Un appel plus récent (nouveau create/join, ou leaveRoom) a pris le
        // dessus pendant la lecture du playerId : cette tentative est morte.
        if (requestIdRef.current !== requestId) return;
        // Code de salle inconnu jusqu'à la première `room_state` : voir
        // PendingSession.
        const session: PendingSession = { roomCode: '', playerName, playerId };
        sessionRef.current = session;
        connect(() => {
          const payload: CreatePayload = { playerName, playerId };
          return { type: TypeCreate, data: payload };
        });
      });
    },
    [clearReconnectTimer, closeSocket, connect],
  );

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      clearReconnectTimer();
      closeSocket();
      reconnectAttemptRef.current = 0;
      setState({ status: 'connecting', room: null, errorMessage: null });

      const requestId = ++requestIdRef.current;
      void getOrCreatePlayerId().then((playerId) => {
        if (requestIdRef.current !== requestId) return;
        const session: PendingSession = { roomCode, playerName, playerId };
        sessionRef.current = session;
        connect(() => buildJoinEnvelope(session));
      });
    },
    [clearReconnectTimer, closeSocket, connect],
  );

  // Quitte la salle explicitement : annule tout retry programmé, ferme le
  // socket, efface la session persistée (le playerId, lui, reste stable pour
  // la vie de l'app — ce n'est pas lui qui identifie une salle) et repasse à
  // `idle`.
  const leaveRoom = useCallback(() => {
    clearReconnectTimer();
    requestIdRef.current += 1;
    sessionRef.current = null;
    closeSocket();
    void clearRoomSession();
    setState(IDLE_STATE);
  }, [clearReconnectTimer, closeSocket]);

  // Reprise automatique : si une session de salle a survécu au montage
  // précédent (app relancée pendant une partie), on retente un `join`
  // immédiat plutôt que d'afficher le formulaire vide.
  useEffect(() => {
    let cancelled = false;
    const requestId = requestIdRef.current;
    void loadRoomSession().then((session) => {
      if (cancelled || !session) return;
      // Un appel manuel (createRoom/joinRoom/leaveRoom) est survenu pendant
      // la lecture d'AsyncStorage : ne pas écraser l'action de l'utilisateur
      // avec la session persistée, potentiellement obsolète.
      if (requestIdRef.current !== requestId) return;
      joinRoom(session.roomCode, session.playerName);
    });
    return () => {
      cancelled = true;
    };
  }, [joinRoom]);

  // Ferme le socket et annule un éventuel retry programmé si l'écran est
  // démonté (pas de fuite, pas de reconnexion fantôme en arrière-plan).
  // `socketRef.current` est invalidé *avant* `.close()` : `onclose` de ce
  // socket arrive de façon asynchrone, potentiellement après ce cleanup, et
  // son `isCurrent()` doit déjà voir `false` pour ne programmer aucun retry
  // (même idiome que `connect`/`leaveRoom`).
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current != null) clearTimeout(reconnectTimerRef.current);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, []);

  return { ...state, createRoom, joinRoom, leaveRoom };
}
