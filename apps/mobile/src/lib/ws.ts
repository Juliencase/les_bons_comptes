// Client WebSocket minimal pour parler au serveur multijoueur (apps/api).
// Pas de dépendance externe : le WebSocket natif de React Native /
// react-native-web suffit pour la poignée de messages JSON échangés ici.
import { useCallback, useEffect, useRef } from 'react';
import {
  CreatePayload,
  Envelope,
  ErrorPayload,
  isEnvelope,
  isKnownMessageType,
  JoinPayload,
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
import { useStore } from './store';
import { RoomConnectionState } from './types';

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
 * Dérive l'URL HTTP de base du serveur à partir de `resolveWsUrl()` — même
 * hôte, mais `ws(s)://` → `http(s)://` et sans le `/ws` final. Pas de
 * variable d'environnement dédiée : une seule valeur à faire varier au build
 * pour les deux usages (WebSocket et REST, ex. `GET /admin/rooms`).
 */
export function resolveApiBaseUrl(): string {
  const wsUrl = resolveWsUrl();
  const httpUrl = wsUrl.startsWith('wss://')
    ? `https://${wsUrl.slice('wss://'.length)}`
    : wsUrl.startsWith('ws://')
      ? `http://${wsUrl.slice('ws://'.length)}`
      : wsUrl;
  return httpUrl.replace(/\/ws$/, '');
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
// joinRoom() — utilisé pour adapter la copie de RoomScreen ; le hub, lui,
// retrouve indépendamment le créateur d'origine via `playerId` (voir
// roomCreatorPlayerIDs dans hub.go), donc cette valeur n'a pas besoin de
// rester correcte pour que "Supprimer la salle" fonctionne après une
// reconnexion, seulement pour l'affichage.
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

/** Écrit le slice de connexion dans le store (remplacement complet, jamais un patch). */
function setRoomConnection(next: RoomConnectionState): void {
  useStore.getState().setRoomConnection(next);
}

/**
 * Ouvre une connexion au serveur multijoueur ; son état est lu par le
 * composant appelant depuis le store (`useStore`, slice `roomConnection`) :
 * `idle` → `connecting` → `connected`/`error`, avec un `reconnecting`
 * intercalé lors d'une coupure après connexion. Un seul socket vit à la
 * fois : rappeler `createRoom`/`joinRoom` referme silencieusement une
 * tentative précédente. Un seul appelant doit posséder une connexion à la
 * fois (aujourd'hui `RoomScreen`) — appeler ce hook une seconde fois
 * ouvrirait une deuxième WebSocket.
 *
 * Une fermeture inattendue (ni `leaveRoom()`, ni un nouvel appel
 * `createRoom`/`joinRoom`) survenant après un `connected`, ou pendant une
 * reconnexion déjà en cours, programme un nouvel essai avec un backoff
 * exponentiel plafonné (`computeBackoffDelayMs`) — indéfiniment tant que le
 * composant reste monté. Le hub Go ne fusionne pas encore l'ancienne et la
 * nouvelle entrée d'un joueur quelconque dans la liste de la salle (voir
 * `packages/shared/src/generated/protocol.ts`, PlayerID) : une reconnexion
 * recrée côté serveur un nouveau joueur dans la salle affichée aux autres
 * — compromis accepté pour cette phase, pas de tentative de le masquer côté
 * client. Seule l'identité du créateur, elle, est déjà reconnue via
 * `playerId` (voir roomCreatorPlayerIDs dans hub.go).
 *
 * Expose aussi `isResuming` (store) : `true` le temps que la reprise
 * automatique d'une session persistée (`roomSession`, voir plus bas) se
 * conclue, pour que l'appelant masque le formulaire créer/rejoindre pendant
 * ce délai au lieu de l'afficher en flash avant bascule vers la salle
 * retrouvée.
 *
 * Et `isCreator` : `true` quand la session courante vient d'un `createRoom()`
 * (y compris retrouvée par la reprise automatique), `false` sinon — hors de
 * toute salle ou après un `joinRoom()`. À l'usage de l'affichage (ex.
 * RoomScreen distingue "Supprimer la salle" de "Quitter la salle") ; le
 * serveur, lui, retrouve indépendamment la créatrice d'origine via
 * `playerId` (roomCreatorPlayerIDs dans hub.go), donc "Supprimer la salle"
 * fonctionne réellement même après une reconnexion.
 */
export function useRoomSocket() {
  const { status, room, errorMessage, isCreator, isResuming } = useStore(
    (s) => s.roomConnection,
  );
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
  // dessein : tout ce dont la fonction a besoin (refs, le store — stable via
  // `useStore.getState()`, imports de module) est stable, ce qui permet à
  // `onclose` de se reprogrammer elle-même (via `connect`, capturé par
  // closure) sans dépendance circulaire avec un `scheduleReconnect` séparé.
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
          useStore.getState().setRoomSession({
            roomCode: payload.room.code,
            playerName: session.playerName,
            isCreator: session.isCreator,
          });
        }
        setRoomConnection({
          status: 'connected',
          room: payload.room,
          errorMessage: null,
          isCreator: session?.isCreator ?? false,
          isResuming: useStore.getState().roomConnection.isResuming,
        });
      } else if (envelope.type === TypeErrorMessage) {
        const payload = envelope.data as ErrorPayload | null;
        setRoomConnection({
          status: 'error',
          room: null,
          errorMessage: payload?.message || CONNECTION_FAILED_MESSAGE,
          isCreator: false,
          isResuming: useStore.getState().roomConnection.isResuming,
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
        useStore.getState().setRoomSession(null);
        setRoomConnection({
          status: 'error',
          room: null,
          errorMessage: payload.message,
          isCreator: false,
          isResuming: useStore.getState().roomConnection.isResuming,
        });
      }
    };

    socket.onclose = () => {
      if (!isCurrent()) return;
      socketRef.current = null;

      const session = sessionRef.current;
      const prev = useStore.getState().roomConnection;
      // Fermeture avant toute connexion établie (ou après une salle déjà
      // quittée) : l'échec attendu, pas de retry. On ne retente que si on
      // connaît la salle à rejoindre (session non nulle) et qu'on était
      // déjà connecté, ou déjà en train de retenter.
      const shouldRetry =
        session != null &&
        (prev.status === 'connected' || prev.status === 'reconnecting');
      if (!shouldRetry) {
        setRoomConnection({
          status: 'error',
          room: null,
          errorMessage: CONNECTION_FAILED_MESSAGE,
          isCreator: false,
          isResuming: useStore.getState().roomConnection.isResuming,
        });
        return;
      }

      const attempt = reconnectAttemptRef.current;
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect(() => buildJoinEnvelope(session));
      }, computeBackoffDelayMs(attempt));

      setRoomConnection({
        status: 'reconnecting',
        room: prev.room,
        errorMessage: null,
        isCreator: session.isCreator,
        isResuming: useStore.getState().roomConnection.isResuming,
      });
    };
  }, []);

  const createRoom = useCallback(
    (playerName: string) => {
      clearReconnectTimer();
      closeSocket();
      reconnectAttemptRef.current = 0;
      setRoomConnection({
        status: 'connecting',
        room: null,
        errorMessage: null,
        isCreator: true,
        isResuming: useStore.getState().roomConnection.isResuming,
      });

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
      setRoomConnection({
        status: 'connecting',
        room: null,
        errorMessage: null,
        isCreator,
        isResuming: useStore.getState().roomConnection.isResuming,
      });

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
    useStore.getState().setRoomSession(null);
    setRoomConnection({
      status: 'idle',
      room: null,
      errorMessage: null,
      isCreator: false,
      isResuming: false,
    });
  }, [clearReconnectTimer, closeSocket]);

  // Reprise automatique : si une session de salle a survécu au montage
  // précédent (app relancée pendant une partie), on retente un `join`
  // immédiat plutôt que d'afficher le formulaire vide. Lecture **synchrone**
  // du store (`useStore.getState()`) plutôt qu'une lecture AsyncStorage
  // dédiée : le store est déjà hydraté avant que RoomScreen ne monte (voir
  // App.tsx, qui bloque le rendu tant que `hydrated` n'est pas vrai), donc
  // `roomSession` est immédiatement fiable — plus besoin d'attendre une
  // promesse ni de garde anti-course (l'ancienne version guettait un appel
  // manuel survenu pendant cette attente ; ici l'effet se résout dans le même
  // tick que le montage, avant qu'aucune action manuelle ne soit possible).
  // `isResuming` doit être forcé à `true` ici *avant* d'appeler `joinRoom` :
  // le store est global et survit à un démontage/remontage de l'écran, donc
  // sa valeur courante peut très bien déjà être `false` (laissée par un
  // montage précédent) — sans ce forçage, l'appel `setRoomConnection` fait
  // par `joinRoom` la lirait telle quelle et le formulaire flasherait avant
  // la bascule vers la salle retrouvée. `isResuming` reste `true` le temps de
  // l'appel réseau lui-même — voir l'effet suivant, qui l'éteint une fois
  // `status` arrivé à un état terminal.
  useEffect(() => {
    const session = useStore.getState().roomSession;
    if (session) {
      setRoomConnection({ ...useStore.getState().roomConnection, isResuming: true });
      joinRoom(session.roomCode, session.playerName, session.isCreator);
    } else {
      setRoomConnection({
        status: 'idle',
        room: null,
        errorMessage: null,
        isCreator: false,
        isResuming: false,
      });
    }
  }, [joinRoom]);

  // Éteint `isResuming` dès que le `join` automatique ci-dessus atteint un
  // état terminal (succès : `connected`/`reconnecting` ; échec : `error`) —
  // sans cet effet, rien ne repasserait `isResuming` à `false` après une
  // reprise réussie ou échouée. `isResuming` (destructuré du store en tête de
  // hook) est fiable ici, contrairement à l'intérieur des callbacks
  // ci-dessus : cet effet re-tourne à chaque changement du store (deps),
  // alors que `connect`/`createRoom`/`joinRoom` sont mémoïsés une fois pour
  // toutes (deps vides ou stables) et figeraient une valeur lue par closure —
  // d'où leur lecture systématique via `useStore.getState()` à la place.
  useEffect(() => {
    if (!isResuming) return;
    if (
      status === 'connected' ||
      status === 'reconnecting' ||
      status === 'error'
    ) {
      setRoomConnection({
        status,
        room,
        errorMessage,
        isCreator,
        isResuming: false,
      });
    }
  }, [status, room, errorMessage, isCreator, isResuming]);

  // Ferme le socket et annule un éventuel retry programmé si l'écran est
  // démonté (pas de fuite, pas de reconnexion fantôme en arrière-plan).
  // `socketRef.current` est invalidé *avant* `.close()` : `onclose` de ce
  // socket arrive de façon asynchrone, potentiellement après ce cleanup, et
  // son `isCurrent()` doit déjà voir `false` pour ne programmer aucun retry
  // (même idiome que `connect`/`leaveRoom`).
  //
  // `roomConnection` (store) est remis à son état neutre au passage : sans
  // ça, un autre composant qui lirait ce slice pendant que RoomScreen est
  // démonté (ex. un futur badge « salle en cours » sur GamesScreen) verrait
  // un `status: 'connected'` figé alors que le socket réel vient d'être
  // fermé — le slice doit refléter qu'aucune connexion n'est active, pas
  // juste que personne ne regarde plus.
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current != null)
        clearTimeout(reconnectTimerRef.current);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
      setRoomConnection({
        status: 'idle',
        room: null,
        errorMessage: null,
        isCreator: false,
        isResuming: false,
      });
    };
  }, []);

  return {
    status,
    room,
    errorMessage,
    isResuming,
    isCreator,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
