// Package protocol définit les messages échangés sur le WebSocket.
//
// # Source de vérité
//
// Ce paquet est **la** source de vérité du contrat front/back. Les types
// TypeScript de `packages/shared/src/generated/protocol.ts` en sont générés
// (`make generate`, via tygo) et ne doivent jamais être édités à la main.
//
// Conséquence : toute modification ici est un changement de contrat. Il faut
// régénérer, et la CI refuse un commit où le TS généré aurait dérivé du Go.
//
// Contrainte à garder en tête en éditant : tygo traduit les structs et les
// blocs de constantes typées, pas les interfaces ni les génériques. Reste sur
// des structs plates avec des tags `json` explicites.
package protocol

import "encoding/json"

// Version du protocole. À incrémenter dès qu'un changement casse les clients
// déjà déployés — l'app mobile est installée sur des téléphones qu'on ne met
// pas à jour de force.
const Version = 1

// MessageType discrimine les messages transportés par Envelope.
type MessageType string

const (
	// Client → serveur.
	TypeCreate MessageType = "create"
	TypeJoin   MessageType = "join"
	TypeLeave  MessageType = "leave"

	// Serveur → client.
	TypeRoomState MessageType = "room_state"
	TypeError     MessageType = "error"
)

// Envelope est le cadre commun à tous les messages : un discriminant et une
// charge utile encore brute. Le décodage de `Data` dépend de `Type` — c'est au
// destinataire de faire le second passage, une fois qu'il sait quoi attendre.
type Envelope struct {
	Type MessageType     `json:"type"`
	Data json.RawMessage `json:"data"`
}

// Player est un joueur connecté, tel que les autres clients le voient.
type Player struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Room est une partie partagée, identifiée par un code court que les joueurs
// se communiquent hors de l'app.
type Room struct {
	Code    string   `json:"code"`
	Players []Player `json:"players"`
}

// CreatePayload — charge utile de TypeCreate. Le serveur alloue un nouveau
// code de room et y ajoute directement l'émetteur comme premier joueur (pas
// de round-trip create puis join pour le créateur) ; la réponse est un
// TypeRoomState classique, code inclus.
type CreatePayload struct {
	PlayerName string `json:"playerName"`
}

// JoinPayload — charge utile de TypeJoin. Utilisé par tout joueur qui
// rejoint une room existante après sa création, créateur exclu (voir
// CreatePayload).
type JoinPayload struct {
	RoomCode   string `json:"roomCode"`
	PlayerName string `json:"playerName"`
}

// RoomStatePayload — charge utile de TypeRoomState. Le serveur renvoie l'état
// complet de la salle plutôt qu'un delta : c'est plus coûteux en octets, mais
// ça rend la resynchronisation après reconnexion triviale côté mobile.
type RoomStatePayload struct {
	Room Room `json:"room"`
}

// ErrorPayload — charge utile de TypeError. `Code` est destiné au code
// appelant, `Message` à l'affichage.
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
