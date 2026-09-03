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
  RoomClosedPayload,
  RoomStatePayload,
  TypeCreate,
  TypeError as TypeErrorMessage,
  TypeJoin,
  TypeLeave,
  TypeRoomClosed,
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
  // `true` quand la session courante vient de createRoom(), `false` sinon
  // (joinRoom(), ou hors de toute salle) — voir PendingSession.
  isCreator: boolean;
};

const IDLE_STATE: RoomSocketState = {
  status: 'idle',
  room: null,
  errorMessage: null,
  isCreator: false,
};

// Message affiché à l'utilisateur : jamais le détail technique (code réseau,
// raison de fermeture...), qui n'aiderait personne autour d'une table de jeu.
const CONNECTION_FAILED_MESSAGE =
  'Connexion au serveur impossible. Vérifiez le réseau et réessayez.';

// Ce que le hook garde en mémoire pour rejouer un `join` identique lors d'une
// reconnexion — que la connexion d'origine ait été un `create` ou un `join`,
// un retry est toujours un `join` vers la salle déjà rejointe (voir `connect`
// plus bas). `roomCode` vaut '' tant que le serveur ne l'a pas confirmé (juste
// après un `create`, avant la toute première `room_state`). `isCreator`
// distingue une session née d'un createRoom() d'une session née d'un
// joinRoom() — purement informatif côté client (le hub ne traite plus une
// reconnexion comme celle du créateur, voir hub.go), utilisé uniquement pour
// adapter la copie de RoomScreen.
type PendingSession = {
  roomCode: string;
  playerName: string;
  playerId: string;
  isCreator: boolean;
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
 *
 * Expose aussi `isResuming` : `true` le temps que la reprise automatique
 * d'une session persistée (voir plus bas) se conclue, pour que l'appelant
 * masque le formulaire créer/rejoindre pendant ce délai au lieu de
 * l'afficher en flash avant bascule vers la salle retrouvée.
 *
 * Et `isCreator` : `true` quand la session courante vient d'un `createRoom()`
 * (y compris retrouvée par la reprise automatique), `false` sinon — hors de
 * toute salle ou après un `joinRoom()`. Purement déclaratif côté client, à
 * l'usage de l'affichage (ex. RoomScreen distingue "Supprimer la salle" de
 * "Quitter la salle") : voir la limite documentée sur `roomCreators` dans
 * hub.go, une reconnexion n'étant plus reconnue comme créatrice côté serveur.
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
  // `true` tant qu'un `join` automatique (déclenché par la session persistée
  // au montage, voir plus bas) est en cours : le composant appelant s'en sert
  // pour masquer le formulaire créer/rejoindre le temps de savoir si la
  // reprise réussit, plutôt que de l'afficher en flash avant bascule vers la
  // salle retrouvée. N'a aucun rapport avec `connecting`/`reconnecting`, qui
  // couvrent aussi les tentatives manuelles.
  const [isResuming, setIsResuming] = useState(true);
  // Miroir de `isResuming` lisible de façon synchrone dans l'effet ci-dessous
  // (qui réagit à `status`) : distingue une reprise automatique en cours
  // d'une simple connexion manuelle, pour ne couper `isResuming` que quand
  // c'est bien elle qui atteint un état terminal.
  const resumingRef = useRef(false);

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
            isCreator: session.isCreator,
          });
        }
        setState({
          status: 'connected',
          room: payload.room,
          errorMessage: null,
          isCreator: session?.isCreator ?? false,
        });
      } else if (envelope.type === TypeErrorMessage) {
        const payload = envelope.data as ErrorPayload | null;
        setState({
          status: 'error',
          room: null,
          errorMessage: payload?.message || CONNECTION_FAILED_MESSAGE,
          isCreator: false,
        });
      } else if (envelope.type === TypeRoomClosed) {
        const payload = envelope.data as RoomClosedPayload | null;
        if (!payload?.message) return;
        // Reçu par un joueur qui n'est pas à l'origine de la fermeture (le
        // créateur a quitté la salle, le serveur l'a supprimée) : comme
        // leaveRoom(), on annule tout retry programmé et on efface la
        // session persistée — sans quoi le prochain montage de l'écran
        // retenterait de rejoindre une salle qui n'existe plus — avant de
        // fermer le socket. `socketRef.current` est invalidé avant `.close()`
        // (même idiome que leaveRoom()/l'effet de démontage) pour qu'un
        // `onclose` tardif de ce même socket ne programme aucun retry
        // fantôme.
        if (reconnectTimerRef.current != null) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        sessionRef.current = null;
        socketRef.current = null;
        socket.close();
        void clearRoomSession();
        setState({
          status: 'error',
          room: null,
          errorMessage: payload.message,
          isCreator: false,
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
            isCreator: false,
          };
        }

        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect(() => buildJoinEnvelope(session));
        }, computeBackoffDelayMs(attempt));

        return {
          status: 'reconnecting',
          room: prev.room,
          errorMessage: null,
          isCreator: session.isCreator,
        };
      });
    };
  }, []);

  const createRoom = useCallback(
    (playerName: string) => {
      clearReconnectTimer();
      closeSocket();
      reconnectAttemptRef.current = 0;
      setState({ status: 'connecting', room: null, errorMessage: null, isCreator: true });

      const requestId = ++requestIdRef.current;
      void getOrCreatePlayerId().then((playerId) => {
        // Un appel plus récent (nouveau create/join, ou leaveRoom) a pris le
        // dessus pendant la lecture du playerId : cette tentative est morte.
        if (requestIdRef.current !== requestId) return;
        // Code de salle inconnu jusqu'à la première `room_state` : voir
        // PendingSession.
        const session: PendingSession = {
          roomCode: '',
          playerName,
          playerId,
          isCreator: true,
        };
        sessionRef.current = session;
        connect(() => {
          const payload: CreatePayload = { playerName, playerId };
          return { type: TypeCreate, data: payload };
        });
      });
    },
    [clearReconnectTimer, closeSocket, connect],
  );

  // `isCreator` par défaut à `false` pour un appel normal (rejoindre une
  // salle n'en fait jamais le créateur) ; la reprise automatique plus bas le
  // passe explicitement à la valeur mémorisée dans la session persistée, pour
  // ne pas la perdre en rejouant un `join` là où l'utilisateur avait fait un
  // `create`.
  const joinRoom = useCallback(
    (roomCode: string, playerName: string, isCreator = false) => {
      clearReconnectTimer();
      closeSocket();
      reconnectAttemptRef.current = 0;
      setState({ status: 'connecting', room: null, errorMessage: null, isCreator });

      const requestId = ++requestIdRef.current;
      void getOrCreatePlayerId().then((playerId) => {
        if (requestIdRef.current !== requestId) return;
        const session: PendingSession = {
          roomCode,
          playerName,
          playerId,
          isCreator,
        };
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
    // Prévient le hub qu'il s'agit d'un départ volontaire — seul un vrai
    // `leave` (par opposition à une simple coupure détectée par le serveur)
    // lui permet de distinguer "le créateur ferme sa salle" de "le créateur
    // a perdu le réseau", ce second cas devant continuer à laisser une
    // chance de reconnexion. Best-effort : le socket peut déjà être en train
    // de se fermer, auquel cas on ne bloque pas dessus.
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: TypeLeave, data: {} }));
    }
    closeSocket();
    void clearRoomSession();
    setState(IDLE_STATE);
  }, [clearReconnectTimer, closeSocket]);

  // Reprise automatique : si une session de salle a survécu au montage
  // précédent (app relancée pendant une partie), on retente un `join`
  // immédiat plutôt que d'afficher le formulaire vide. `isResuming` reste
  // `true` le temps de cet appel — voir l'effet suivant, qui l'éteint une
  // fois `status` arrivé à un état terminal.
  useEffect(() => {
    let cancelled = false;
    const requestId = requestIdRef.current;
    void loadRoomSession().then((session) => {
      if (cancelled) return;
      // Un appel manuel (createRoom/joinRoom/leaveRoom) est survenu pendant
      // la lecture d'AsyncStorage : ne pas écraser l'action de l'utilisateur
      // avec la session persistée, potentiellement obsolète, ni bloquer
      // l'écran sur `isResuming` puisqu'aucune reprise auto n'aura lieu.
      if (!session || requestIdRef.current !== requestId) {
        setIsResuming(false);
        return;
      }
      resumingRef.current = true;
      joinRoom(session.roomCode, session.playerName, session.isCreator);
    });
    return () => {
      cancelled = true;
    };
  }, [joinRoom]);

  // Éteint `isResuming` dès que le `join` automatique ci-dessus atteint un
  // état terminal (succès : `connected`/`reconnecting` ; échec : `error`) —
  // sans cet effet, rien ne repasserait `isResuming` à `false` après une
  // reprise réussie ou échouée.
  useEffect(() => {
    if (!resumingRef.current) return;
    if (
      state.status === 'connected' ||
      state.status === 'reconnecting' ||
      state.status === 'error'
    ) {
      resumingRef.current = false;
      setIsResuming(false);
    }
  }, [state.status]);

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

  return { ...state, isResuming, createRoom, joinRoom, leaveRoom };
}
