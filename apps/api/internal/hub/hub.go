// Package hub gère les connexions WebSocket et l'état des parties partagées.
//
// # Frontière volontaire
//
// Ce paquet est **écrit à la main**, pas délégué à un agent : c'est le cœur
// concurrent du serveur, et donc l'endroit où on apprend réellement Go. Le
// reste du module (routage, config, arrêt gracieux, image Docker, CI) est de
// la plomberie et peut être délégué sans rien perdre. Cf. `apps/api/CLAUDE.md`.
//
// # Le design visé
//
// Un seul principe, et tout en découle : **l'état est possédé par une seule
// goroutine**. `Hub.Run` est cette goroutine. La map `rooms` ne doit jamais
// être lue ni écrite ailleurs — pas de mutex, pas d'accès « juste pour lire ».
// Tout ce qui vient de l'extérieur passe par un channel.
//
//	 une goroutine par connexion            une seule goroutine
//	┌───────────────────────────┐          ┌──────────────────────┐
//	│ HandleConn (lit la socket)│──chan──▶ │ Run (possède `rooms`)│
//	│                           │◀─chan──  │                      │
//	└───────────────────────────┘          └──────────────────────┘
//
// # Ce qu'il reste à écrire
//
//  1. `Run` : une boucle `for { select { ... } }` sur `ctx.Done()`,
//     `register`, `unregister` et `inbound`. Chaque case fait muter `rooms`.
//  2. `HandleConn` : boucle de lecture de la socket, décodage en
//     `protocol.Envelope`, envoi vers `inbound`, et `unregister` en `defer`.
//  3. La diffusion : sur un `inbound` de type `join`/`leave`, recalculer l'état
//     de la salle et le pousser à chaque client de cette salle.
//
// # Les trois pièges qui t'attendent
//
//   - **Interblocage.** Si `Run` écrit dans `client.send` sans buffer pendant
//     que la goroutine du client attend d'écrire dans `inbound`, les deux se
//     bloquent mutuellement et le serveur entier se fige — `Run` étant unique,
//     un seul client lent gèle tout le monde. Réponse habituelle : `send`
//     bufferisé, et en cas de file pleine on déconnecte le client au lieu
//     d'attendre.
//   - **Fuite de goroutines.** Une socket fermée côté client ne prévient pas
//     toujours. Sans `defer` d'`unregister` et sans respect de `ctx`, les
//     goroutines s'accumulent connexion après connexion.
//   - **Data race.** Toucher `rooms` depuis `HandleConn`, même en lecture
//     seule, est une course. Elle ne se verra pas en test manuel : elle se
//     verra avec `go test -race`, qui est pour cette raison un gate de la CI.
package hub

import (
	"context"

	"github.com/coder/websocket"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

// Client représente une connexion WebSocket unique.
//
// Structure de départ, à ajuster librement : elle n'est qu'une proposition.
type Client struct {
	ID   string
	Name string
	Room string

	conn *websocket.Conn

	// send est la file de sortie du client. Bufferisée à dessein : voir le
	// piège « interblocage » dans la doc du paquet.
	send chan protocol.Envelope
}

// Inbound est un message reçu d'un client, transmis à Run pour traitement.
type Inbound struct {
	From *Client
	Msg  protocol.Envelope
}

// Hub possède l'état de toutes les parties partagées.
type Hub struct {
	register   chan *Client
	unregister chan *Client
	inbound    chan Inbound

	// rooms : code de salle → clients connectés à cette salle.
	//
	// N'est touchée que par Run. Toute autre goroutine passe par un channel.
	rooms map[string]map[*Client]struct{}
}

// New alloue un Hub prêt à être démarré par Run.
func New() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		inbound:    make(chan Inbound),
		rooms:      make(map[string]map[*Client]struct{}),
	}
}

// Run fait tourner la boucle du hub jusqu'à annulation de ctx.
//
// TODO(toi) : voir « Ce qu'il reste à écrire », point 1, dans la doc du paquet.
// En l'état le hub accepte les connexions mais ne fait rien d'autre.
func (h *Hub) Run(ctx context.Context) {
	<-ctx.Done()
}

// HandleConn prend possession d'une connexion déjà upgradée et la sert jusqu'à
// sa fermeture. Appelée dans sa propre goroutine, une par connexion.
//
// TODO(toi) : voir « Ce qu'il reste à écrire », point 2, dans la doc du paquet.
func (h *Hub) HandleConn(ctx context.Context, conn *websocket.Conn) {
	_ = ctx
	_ = conn.Close(websocket.StatusGoingAway, "hub pas encore implemente")
}
