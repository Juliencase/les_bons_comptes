// Package hub gère les connexions WebSocket et l'état des parties partagées.
//
// # Frontière volontaire
//
// Ce paquet est **écrit à la main**, pas délégué à un agent : c'est le cœur
// concurrent du serveur, et donc l'endroit où on apprend réellement Go. Le
// reste du module (routage, config, arrêt gracieux, image Docker, CI) est de
// la plomberie et peut être délégué sans rien perdre. Cf. `apps/api/CLAUDE.md`.
//
// # Le design retenu
//
// Un seul principe, et tout en découle : **l'état est possédé par une seule
// goroutine**. `Hub.Run` est cette goroutine. Les maps `rooms` et
// `roomTimers` ne sont jamais lues ni écrites ailleurs — pas de mutex, pas
// d'accès « juste pour lire ». Tout ce qui vient de l'extérieur (une
// connexion, un message, l'expiration d'une room) passe par un channel et un
// `case` du `select` de `Run`.
//
//	 une goroutine par connexion            une seule goroutine
//	┌───────────────────────────┐          ┌──────────────────────┐
//	│ HandleConn (lit la socket)│──chan──▶ │ Run (possède `rooms`)│
//	│ + sa propre goroutine     │◀─chan──  │                      │
//	│   d'écriture (writeLoop)  │          └──────────────────────┘
//	└───────────────────────────┘
//
// `HandleConn` ne touche jamais `rooms` : elle lit la socket et pousse sur
// `inbound`, et écrit sur la socket ce que `Run` dépose dans `client.send`.
// `Run` ne touche jamais la socket directement, sauf pour la fermer de force
// (`kick`) quand un client est trop lent — `Conn.CloseNow` est documenté sûr
// à appeler depuis n'importe quelle goroutine pendant qu'une autre lit/écrit.
//
// # Les trois pièges qui t'attendent
//
//   - **Interblocage.** Si `Run` écrit dans `client.send` sans buffer pendant
//     que la goroutine du client attend d'écrire dans `inbound`, les deux se
//     bloquent mutuellement et le serveur entier se fige — `Run` étant unique,
//     un seul client lent gèle tout le monde. Réponse retenue : `send`
//     bufferisé, et en cas de file pleine (`deliver`) on ferme la connexion
//     du client au lieu d'attendre — son `unregister` arrivera plus tard,
//     dans un tour de boucle suivant, jamais dans celui-ci.
//   - **Fuite de goroutines.** Une socket fermée côté client ne prévient pas
//     toujours. `conn.Read`/`conn.Write` sont bornés par le `ctx` de la
//     requête (annulé quand la connexion TCP tombe), et `unregister` est
//     posté en `defer`, avant tout `return` de `HandleConn`.
//   - **Data race.** Toucher `rooms`/`roomTimers` depuis `HandleConn` ou
//     depuis le callback d'un `time.AfterFunc`, même en lecture seule, est
//     une course. Elle ne se voit pas en test manuel : elle se voit avec
//     `go test -race`, qui est pour cette raison un gate de la CI. C'est
//     pourquoi l'expiration d'une room ne supprime rien depuis son timer :
//     elle poste sur `expireRoom` et laisse `Run` trancher — y compris
//     revérifier que la room est toujours vide, au cas où quelqu'un l'aurait
//     rejointe entre le déclenchement du timer et son traitement par `Run`.
package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

const (
	// clientSendBuffer : voir le piège « interblocage » ci-dessus.
	clientSendBuffer = 8
	// writeTimeout borne chaque écriture individuelle vers un client.
	writeTimeout = 5 * time.Second
	// defaultRoomExpiryGrace : délai avant suppression d'une room devenue
	// vide, pour survivre à une coupure réseau ou un changement d'appli
	// brefs. Champ (et non constante utilisée directement) pour rester
	// ajustable en test — voir Hub.roomExpiryGrace.
	defaultRoomExpiryGrace = 5 * time.Minute
)

// Store persiste les salles pour que GET /admin/rooms reflète l'état réel du
// serveur plutôt que la session que le client mobile garde de son côté (voir
// internal/roomstore). Écrite uniquement depuis Run (voir la doc du paquet) :
// pas de synchronisation supplémentaire nécessaire côté hub. Une erreur de
// persistance est journalisée et n'interrompt jamais le traitement d'une
// salle en direct — voir persistRoom.
type Store interface {
	Create(code, creatorName string, players []protocol.Player, createdAt time.Time) error
	UpdatePlayers(code string, players []protocol.Player) error
	Delete(code string) error
}

// nextClientID génère des identifiants uniques dans le process. Pas besoin
// d'aléatoire cryptographique : ces IDs ne servent qu'à distinguer des
// connexions entre elles côté serveur, jamais comme secret.
var nextClientID atomic.Uint64

func newClientID() string {
	return fmt.Sprintf("c%d", nextClientID.Add(1))
}

// Client représente une connexion WebSocket unique.
type Client struct {
	ID   string
	Name string
	Room string // code de la room courante, "" si aucune.
	// PlayerID est l'identifiant stable envoyé par le client (voir
	// protocol.CreatePayload/JoinPayload) — contrairement à ID, il survit à
	// une reconnexion (nouvelle *Client, même PlayerID). Sert uniquement à
	// reconnaître un créateur qui revient, voir roomCreatorPlayerIDs.
	PlayerID string

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
	logger *slog.Logger

	register   chan *Client
	unregister chan *Client
	inbound    chan Inbound
	expireRoom chan string

	// rooms : code de salle → clients connectés à cette salle.
	// roomTimers : code de salle → minuteur de suppression en cours (room
	// devenue vide, pas encore expirée).
	// roomCreators : code de salle → client qui l'a créée via handleCreate.
	// Sert uniquement à handleLeave, pour fermer la salle quand son créateur
	// la quitte volontairement (voir closeRoomByCreator). removeFromRoom
	// supprime l'entrée dès que ce client quitte la salle par un autre chemin
	// (coupure, ou création/jointure d'une autre salle sans avoir quitté
	// celle-ci), donc elle ne reste jamais un pointeur mort — mais une
	// reconnexion crée un nouveau *Client : sans roomCreatorPlayerIDs
	// ci-dessous, le créateur d'origine ne serait plus reconnu comme tel pour
	// la salle qu'il a retrouvée.
	// roomCreatorPlayerIDs : code de salle → PlayerID du créateur, fixé à la
	// création et jamais retiré tant que la salle existe (contrairement à
	// roomCreators, qui suit la connexion *Client courante et disparaît à
	// chaque déconnexion). handleJoin s'en sert pour relier roomCreators au
	// nouveau *Client d'un créateur qui revient avec le même PlayerID.
	//
	// Aucune n'est touchée hors de Run.
	rooms                map[string]map[*Client]struct{}
	roomTimers           map[string]*time.Timer
	roomCreators         map[string]*Client
	roomCreatorPlayerIDs map[string]string

	// roomExpiryGrace : voir defaultRoomExpiryGrace. Champ plutôt que
	// constante utilisée en dur pour rester raccourcissable en test.
	roomExpiryGrace time.Duration

	// store : voir le type Store ci-dessus.
	store Store
}

// New alloue un Hub prêt à être démarré par Run. store ne doit jamais être
// nil : passer un Store dont les méthodes ne font rien si la persistance
// n'est pas souhaitée (les tests utilisent un vrai roomstore.Store sur
// fichier temporaire, voir hub_test.go).
func New(logger *slog.Logger, store Store) *Hub {
	return &Hub{
		logger:               logger,
		register:             make(chan *Client),
		unregister:           make(chan *Client),
		inbound:              make(chan Inbound),
		expireRoom:           make(chan string, 16),
		rooms:                make(map[string]map[*Client]struct{}),
		roomTimers:           make(map[string]*time.Timer),
		roomCreators:         make(map[string]*Client),
		roomCreatorPlayerIDs: make(map[string]string),
		roomExpiryGrace:      defaultRoomExpiryGrace,
		store:                store,
	}
}

// Run fait tourner la boucle du hub jusqu'à annulation de ctx. C'est la seule
// goroutine autorisée à toucher rooms/roomTimers — voir la doc du paquet.
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case c := <-h.register:
			h.logger.Info("client connecte", "clientID", c.ID)
		case c := <-h.unregister:
			h.handleUnregister(c)
		case in := <-h.inbound:
			h.handleInbound(in)
		case code := <-h.expireRoom:
			h.handleExpire(code)
		}
	}
}

func (h *Hub) handleInbound(in Inbound) {
	switch in.Msg.Type {
	case protocol.TypeCreate:
		h.handleCreate(in.From, in.Msg.Data)
	case protocol.TypeJoin:
		h.handleJoin(in.From, in.Msg.Data)
	case protocol.TypeLeave:
		h.handleLeave(in.From)
	default:
		h.sendError(in.From, "type_inconnu", fmt.Sprintf("type de message inconnu : %q", in.Msg.Type))
	}
}

func (h *Hub) handleCreate(c *Client, data json.RawMessage) {
	var payload protocol.CreatePayload
	if err := json.Unmarshal(data, &payload); err != nil {
		h.sendError(c, "payload_invalide", "requete illisible")
		return
	}
	if !h.requirePlayerName(c, payload.PlayerName) {
		return
	}

	// Un client qui recree une room alors qu'il en a deja une doit d'abord en
	// sortir : sinon son ancienne room garde une entree fantome (elle ne
	// devient jamais vide, donc n'expire jamais).
	h.removeFromRoom(c)

	code := h.newRoomCode()
	c.Name = payload.PlayerName
	c.PlayerID = payload.PlayerID
	c.Room = code
	h.rooms[code] = map[*Client]struct{}{c: {}}
	h.roomCreators[code] = c
	h.roomCreatorPlayerIDs[code] = payload.PlayerID

	h.logger.Info("room creee", "code", code, "clientID", c.ID)
	h.persistRoomCreated(code, c.Name)
	h.broadcastRoomState(code)
}

// newRoomCode tire un code à 4 chiffres inédit dans rooms. Appelée depuis
// Run uniquement : la vérification d'unicité lit rooms sans verrou.
func (h *Hub) newRoomCode() string {
	for {
		code := fmt.Sprintf("%04d", rand.IntN(10000))
		if _, exists := h.rooms[code]; !exists {
			return code
		}
	}
}

func (h *Hub) handleJoin(c *Client, data json.RawMessage) {
	var payload protocol.JoinPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		h.sendError(c, "payload_invalide", "requete illisible")
		return
	}
	if !h.requirePlayerName(c, payload.PlayerName) {
		return
	}

	clients, ok := h.rooms[payload.RoomCode]
	if !ok {
		h.sendError(c, "room_introuvable", "aucune salle avec ce code")
		return
	}

	// Meme raison qu'au debut de handleCreate : quitter l'ancienne room
	// d'abord, sinon elle garde une entree fantome.
	h.removeFromRoom(c)

	c.Name = payload.PlayerName
	c.PlayerID = payload.PlayerID
	c.Room = payload.RoomCode
	clients[c] = struct{}{}
	h.cancelRoomExpiry(payload.RoomCode)

	// Le créateur d'origine revient avec un nouveau *Client (nouvelle
	// connexion) mais le même PlayerID : on relie roomCreators à cette
	// nouvelle connexion, sinon handleLeave ne le reconnaîtrait plus comme
	// créateur (voir roomCreatorPlayerIDs). PlayerID vide : jamais de match,
	// une chaîne vide ne doit jamais valoir "créateur".
	if payload.PlayerID != "" && h.roomCreatorPlayerIDs[payload.RoomCode] == payload.PlayerID {
		h.roomCreators[payload.RoomCode] = c
	}

	h.logger.Info("room rejointe", "code", payload.RoomCode, "clientID", c.ID)
	h.persistRoomPlayers(payload.RoomCode)
	h.broadcastRoomState(payload.RoomCode)
}

// requirePlayerName repond une erreur au client et renvoie false si name est
// vide. Partage entre create et join : seule validation qu'ils ont en commun.
func (h *Hub) requirePlayerName(c *Client, name string) bool {
	if name == "" {
		h.sendError(c, "payload_invalide", "nom de joueur manquant")
		return false
	}
	return true
}

// handleLeave traite un depart volontaire (le client reste connecte, il
// quitte juste la room) — c'est le seul evenement qui peut fermer une salle
// (voir closeRoomByCreator). handleUnregister traite la deconnexion : meme
// nettoyage que pour un joueur quelconque (removeFromRoom), jamais de
// fermeture — une coupure reseau du createur ne doit pas priver les autres
// joueurs de la salle, elle doit au contraire lui laisser une chance de se
// reconnecter comme n'importe quel autre client.
func (h *Hub) handleLeave(c *Client) {
	if code := c.Room; code != "" && h.roomCreators[code] == c {
		h.closeRoomByCreator(code, c)
		return
	}
	h.removeFromRoom(c)
}

// closeRoomByCreator supprime une salle quand son createur la quitte
// volontairement, et tente de previenir les joueurs restants avant de les
// deconnecter — "tente" : deliver() peut, comme partout ailleurs dans le hub,
// fermer directement un client dont la file de sortie est pleine sans lui
// avoir ecrit ce message (voir sa doc), meme compromis que pour tout autre
// envoi. A la difference de removeFromRoom, qui gere un depart individuel
// dans une salle qui continue d'exister, cette fonction demonte toute la
// salle d'un coup : jamais appelee depuis handleUnregister (voir handleLeave).
func (h *Hub) closeRoomByCreator(code string, creator *Client) {
	clients, ok := h.rooms[code]
	if !ok {
		return
	}

	data, err := json.Marshal(protocol.RoomClosedPayload{
		Message: "Le createur a quitte la salle.",
	})
	if err != nil {
		h.logger.Error("encodage room_closed echoue", "err", err)
		return
	}
	env := protocol.Envelope{Type: protocol.TypeRoomClosed, Data: data}

	// writeLoop ferme lui-meme la connexion juste apres avoir ecrit une
	// enveloppe room_closed (voir sa doc) : c'est la seule goroutine qui sait
	// quand l'ecriture a reellement abouti, donc le seul endroit sur qui
	// fermer sans risquer de couper avant que le message ne parte.
	for other := range clients {
		other.Room = ""
		if other == creator {
			continue
		}
		h.deliver(other, env)
	}

	delete(h.rooms, code)
	delete(h.roomCreators, code)
	delete(h.roomCreatorPlayerIDs, code)
	h.cancelRoomExpiry(code)
	h.persistRoomDeleted(code)

	h.logger.Info("room fermee par son createur", "code", code, "clientID", creator.ID)
}

func (h *Hub) handleUnregister(c *Client) {
	h.removeFromRoom(c)
}

// removeFromRoom retire c de sa room courante, diffuse le nouvel etat aux
// joueurs restants, ou programme l'expiration si la room est desormais vide.
// No-op si c n'est dans aucune room.
func (h *Hub) removeFromRoom(c *Client) {
	code := c.Room
	if code == "" {
		return
	}
	c.Room = ""

	// c quitte sans passer par closeRoomByCreator (coupure, ou creation/
	// jointure d'une autre salle sans avoir quitte celle-ci) : si c'etait son
	// createur, l'entree devient inutilisable (plus personne ne pourra jamais
	// la faire correspondre dans handleLeave) et doit etre nettoyee ici,
	// sinon elle reste un pointeur mort jusqu'a l'expiration naturelle de la
	// salle.
	if h.roomCreators[code] == c {
		delete(h.roomCreators, code)
	}

	clients, ok := h.rooms[code]
	if !ok {
		return
	}
	delete(clients, c)
	h.persistRoomPlayers(code)

	if len(clients) == 0 {
		h.scheduleRoomExpiry(code)
		return
	}
	h.broadcastRoomState(code)
}

func (h *Hub) scheduleRoomExpiry(code string) {
	h.roomTimers[code] = time.AfterFunc(h.roomExpiryGrace, func() {
		// Tourne dans sa propre goroutine : on ne touche pas rooms ici, on
		// se contente de reveiller Run. expireRoom est bufferise pour que ce
		// depot n'attende jamais Run indefiniment.
		h.expireRoom <- code
	})
}

// cancelRoomExpiry annule un delai de grace en cours pour code, si il y en a
// un (quelqu'un vient de rejoindre une room qui allait expirer).
func (h *Hub) cancelRoomExpiry(code string) {
	if t, ok := h.roomTimers[code]; ok {
		t.Stop()
		delete(h.roomTimers, code)
	}
}

// handleExpire traite un message expireRoom. Le timer a pu se declencher
// juste avant qu'un join l'annule (course Stop()/execution du callback) :
// on revérifie donc que la room est toujours vide avant de la supprimer.
func (h *Hub) handleExpire(code string) {
	delete(h.roomTimers, code)

	clients, ok := h.rooms[code]
	if !ok || len(clients) > 0 {
		return
	}
	delete(h.rooms, code)
	delete(h.roomCreators, code)
	delete(h.roomCreatorPlayerIDs, code)
	h.persistRoomDeleted(code)
	h.logger.Info("room expiree", "code", code)
}

// roomPlayers construit l'instantané des joueurs d'une salle, dans l'ordre où
// ils apparaissent aux clients (broadcastRoomState) comme dans ce qui est
// persisté (persistRoom*).
func roomPlayers(clients map[*Client]struct{}) []protocol.Player {
	players := make([]protocol.Player, 0, len(clients))
	for c := range clients {
		players = append(players, protocol.Player{ID: c.ID, Name: c.Name})
	}
	return players
}

// persistRoomCreated enregistre une salle tout juste créée. Comme pour les
// deux fonctions suivantes, une erreur de persistance est journalisée et
// jamais remontée : une salle en direct ne doit jamais dépendre du succès
// d'une écriture disque (voir le type Store).
func (h *Hub) persistRoomCreated(code, creatorName string) {
	if err := h.store.Create(code, creatorName, roomPlayers(h.rooms[code]), time.Now()); err != nil {
		h.logger.Error("persistance de la creation de room echouee", "code", code, "err", err)
	}
}

// persistRoomPlayers reflète un changement de composition d'une salle
// existante (join, depart d'un joueur). No-op si code n'est plus dans rooms.
func (h *Hub) persistRoomPlayers(code string) {
	clients, ok := h.rooms[code]
	if !ok {
		return
	}
	if err := h.store.UpdatePlayers(code, roomPlayers(clients)); err != nil {
		h.logger.Error("persistance des joueurs de la room echouee", "code", code, "err", err)
	}
}

// persistRoomDeleted efface une salle fermée ou expirée.
func (h *Hub) persistRoomDeleted(code string) {
	if err := h.store.Delete(code); err != nil {
		h.logger.Error("suppression persistee de la room echouee", "code", code, "err", err)
	}
}

// broadcastRoomState pousse l'etat courant de la room a tous ses clients.
func (h *Hub) broadcastRoomState(code string) {
	clients, ok := h.rooms[code]
	if !ok {
		return
	}

	room := protocol.Room{Code: code, Players: roomPlayers(clients)}

	data, err := json.Marshal(protocol.RoomStatePayload{Room: room})
	if err != nil {
		h.logger.Error("encodage room_state echoue", "err", err)
		return
	}

	env := protocol.Envelope{Type: protocol.TypeRoomState, Data: data}
	for c := range clients {
		h.deliver(c, env)
	}
}

func (h *Hub) sendError(c *Client, code, message string) {
	data, err := json.Marshal(protocol.ErrorPayload{Code: code, Message: message})
	if err != nil {
		h.logger.Error("encodage error echoue", "err", err)
		return
	}
	h.deliver(c, protocol.Envelope{Type: protocol.TypeError, Data: data})
}

// deliver depose env dans la file de sortie de c sans jamais bloquer Run : si
// la file est pleine, le client est considere trop lent et sa connexion est
// fermee de force. Son unregister arrivera plus tard, dans un tour de boucle
// suivant — jamais dans celui-ci (voir le piege « interblocage »).
func (h *Hub) deliver(c *Client, env protocol.Envelope) {
	select {
	case c.send <- env:
	default:
		h.logger.Warn("client trop lent, fermeture de la connexion", "clientID", c.ID)
		c.conn.CloseNow()
	}
}

// HandleConn prend possession d'une connexion déjà upgradée et la sert
// jusqu'à sa fermeture. Appelée dans sa propre goroutine, une par connexion.
func (h *Hub) HandleConn(ctx context.Context, conn *websocket.Conn) {
	client := &Client{
		ID:   newClientID(),
		conn: conn,
		send: make(chan protocol.Envelope, clientSendBuffer),
	}

	select {
	case h.register <- client:
	case <-ctx.Done():
		conn.CloseNow()
		return
	}

	writerDone := make(chan struct{})
	go func() {
		defer close(writerDone)
		h.writeLoop(ctx, client)
	}()

	defer func() {
		select {
		case h.unregister <- client:
		case <-ctx.Done():
		}
		conn.CloseNow()
		<-writerDone
	}()

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}

		var env protocol.Envelope
		if err := json.Unmarshal(data, &env); err != nil {
			// Message mal forme : on l'ignore, la connexion reste ouverte.
			continue
		}

		select {
		case h.inbound <- Inbound{From: client, Msg: env}:
		case <-ctx.Done():
			return
		}
	}
}

// writeLoop vide client.send vers la socket jusqu'a annulation de ctx ou
// erreur d'ecriture. Tourne dans sa propre goroutine : Run n'ecrit jamais sur
// une socket directement (sauf CloseNow, documente sur pour ca).
func (h *Hub) writeLoop(ctx context.Context, c *Client) {
	for {
		select {
		case <-ctx.Done():
			return
		case env := <-c.send:
			data, err := json.Marshal(env)
			if err != nil {
				continue
			}

			wctx, cancel := context.WithTimeout(ctx, writeTimeout)
			err = c.conn.Write(wctx, websocket.MessageText, data)
			cancel()
			if err != nil {
				return
			}
			if env.Type == protocol.TypeRoomClosed {
				// Le message vient d'etre ecrit avec succes : c'est le seul
				// moment sur pour fermer, Close attend l'accuse du client
				// jusqu'a 5s (voir sa doc) puis se termine de toute facon.
				// Erreur ignoree a dessein au-dela du log : la connexion se
				// referme de toute facon (deferred conn.CloseNow() cote
				// HandleConn), rien de plus a tenter ici.
				if err := c.conn.Close(websocket.StatusNormalClosure, "salle fermee"); err != nil {
					h.logger.Warn("fermeture propre echouee apres room_closed", "clientID", c.ID, "err", err)
				}
				return
			}
		}
	}
}
