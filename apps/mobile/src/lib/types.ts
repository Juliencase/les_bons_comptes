// Types du domaine Skull King (systèmes classique + Rascal, formats configurables),
// plus les types de la connexion multijoueur (partagés entre store.ts et ws.ts —
// les placer ici évite un import circulaire entre les deux).
import { Room } from '@lbc/shared';

export type Screen =
  | 'games'
  | 'home'
  | 'setup'
  | 'round'
  | 'scoreboard'
  | 'belote-home'
  | 'belote-setup'
  | 'belote-round'
  | 'belote-scoreboard'
  | 'room';

export type Player = {
  id: string;
  name: string;
};

/**
 * Système de score de la partie, choisi à sa création — cf.
 * docs/REGLES_SKULL_KING.md §4 :
 * - 'skull-king' : le classique (+20/pli misé, -10/pli d'écart) ;
 * - 'rascal'     : le système équilibré (potentiel identique chaque manche,
 *                  gagné à 100 / 50 / 0 % selon la précision de la mise).
 */
export type ScoreSystem = 'skull-king' | 'rascal';

/**
 * Type de mise — option Rascal « Boulet de canon » (§4.B) :
 * - 'chevrotine' : règle Rascal habituelle (10 pts/carte, 100 / 50 / 0 %) ;
 * - 'boulet'     : tout ou rien (15 pts/carte si mise exacte, sinon 0).
 * Sans effet dans le système classique.
 */
export type BidKind = 'chevrotine' | 'boulet';

/** Saisie d'un joueur pour une manche donnée. */
export type RoundEntry = {
  bid: number | null; // mise annoncée (0..cartes) ; null tant que non saisie
  tricks: number | null; // plis remportés (0..cartes) ; null tant que non saisi
  bonus: number; // bonus libre (défaut 0, peut être négatif)
  // Option Rascal uniquement ; absent sur les parties d'avant l'option → chevrotine
  // (lire via bidKindOf() dans lib/scoring.ts plutôt que directement).
  bidKind?: BidKind;
  validated: boolean; // true une fois la manche validée et archivée
};

/** Paramètres choisis à la création d'une partie (cf. SetupScreen). */
export type GameSetup = {
  // Cartes distribuées à chaque manche (cf. FormatDef dans lib/formats.ts) ;
  // le nombre de manches = cardsPerRound.length.
  cardsPerRound: number[];
  scoreSystem: ScoreSystem;
  // Option Rascal : autorise la mise « Boulet de canon » (cf. BidKind).
  cannonballRule: boolean;
};

export type Game = GameSetup & {
  id: string;
  gameKey: string; // clé du jeu compté (cf. GameDef.key dans lib/games.ts)
  players: Player[];
  currentRound: number; // 1..cardsPerRound.length
  // rounds[roundNumber][playerId] = RoundEntry
  rounds: Record<number, Record<string, RoundEntry>>;
  createdAt: number;
  finishedAt?: number;
};

// --- Multijoueur (salle) ------------------------------------------------------

/**
 * État de la connexion au serveur multijoueur (voir lib/ws.ts, useRoomSocket) :
 * - 'idle' : hors de toute salle, formulaire créer/rejoindre affiché ;
 * - 'connecting' : create/join envoyé, en attente de la première room_state ;
 * - 'connected' : salle confirmée par le serveur ;
 * - 'reconnecting' : coupure après connexion, nouvel essai en cours (backoff) ;
 * - 'error' : échec définitif (serveur injoignable, salle fermée...).
 */
export type RoomConnectionStatus =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Reflet dans le store de l'état de connexion WebSocket courant, tenu à jour
 * par useRoomSocket. Volontairement **non persisté** (voir store.ts,
 * partialize) : une connexion ne survit pas à un redémarrage de l'app,
 * contrairement à `RoomSession` ci-dessous qui permet une reprise automatique.
 */
export type RoomConnectionState = {
  status: RoomConnectionStatus;
  room: Room | null;
  errorMessage: string | null;
  // `true` quand la session courante vient de createRoom(), `false` sinon
  // (joinRoom(), ou hors de toute salle). Recoupe `RoomSession.isCreator`
  // ci-dessous sans le remplacer : celui-ci vit tant que la connexion vit
  // (remis à `false` dès `leaveRoom()`/une erreur), l'autre survit à un
  // redémarrage de l'app pour piloter la reprise automatique. Les deux sont
  // mis à jour ensemble à chaque transition (voir useRoomSocket) — aucune
  // des deux n'est dérivable de l'autre, elles n'ont juste pas la même durée
  // de vie.
  isCreator: boolean;
  // `true` tant qu'une reprise automatique de session persistée (voir
  // useRoomSocket) est en cours.
  isResuming: boolean;
};

/**
 * Session de salle **persistée**, pour reprise automatique si RoomScreen
 * remonte plus tard (app relancée pendant une partie) — voir useRoomSocket.
 * Effacée par un leaveRoom() explicite. `isCreator` distingue le joueur qui a
 * créé la salle (createRoom()) de celui qui l'a rejointe (joinRoom()) — voir
 * `RoomConnectionState.isCreator` ci-dessus pour son équivalent non persisté.
 */
export type RoomSession = {
  roomCode: string;
  playerName: string;
  isCreator: boolean;
};
