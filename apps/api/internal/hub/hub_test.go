package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/coder/websocket"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

const testRoomExpiryGrace = 150 * time.Millisecond

// newTestServer démarre un Hub réel (Run tourne pendant toute la durée du
// test) derrière un httptest.Server exposant /ws. httptest.ResponseRecorder
// ne supporte pas le hijacking requis par l'upgrade WebSocket, d'où un vrai
// serveur HTTP plutôt qu'un simple handler testé en mémoire.
func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	h := New(slog.New(slog.DiscardHandler))
	h.roomExpiryGrace = testRoomExpiryGrace

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		h.Run(ctx)
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		h.HandleConn(r.Context(), conn)
	})
	srv := httptest.NewServer(mux)

	t.Cleanup(func() {
		srv.Close()
		cancel()
		<-done
	})

	return srv
}

// dial ouvre une connexion WS vers srv et rend une fonction de fermeture.
func dial(t *testing.T, srv *httptest.Server) *websocket.Conn {
	t.Helper()
	url := "ws" + srv.URL[len("http"):] + "/ws"
	conn, _, err := websocket.Dial(context.Background(), url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	return conn
}

func send(t *testing.T, conn *websocket.Conn, typ protocol.MessageType, payload any) {
	t.Helper()
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("encodage payload: %v", err)
	}
	env := protocol.Envelope{Type: typ, Data: data}
	raw, err := json.Marshal(env)
	if err != nil {
		t.Fatalf("encodage envelope: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := conn.Write(ctx, websocket.MessageText, raw); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func receive(t *testing.T, conn *websocket.Conn) protocol.Envelope {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var env protocol.Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		t.Fatalf("decodage envelope: %v", err)
	}
	return env
}

func roomState(t *testing.T, env protocol.Envelope) protocol.RoomStatePayload {
	t.Helper()
	if env.Type != protocol.TypeRoomState {
		t.Fatalf("type = %q, attendu %q (data=%s)", env.Type, protocol.TypeRoomState, env.Data)
	}
	var payload protocol.RoomStatePayload
	if err := json.Unmarshal(env.Data, &payload); err != nil {
		t.Fatalf("decodage room_state: %v", err)
	}
	return payload
}

func TestCreateAlloueUnCodeEtAjouteLeCreateur(t *testing.T) {
	srv := newTestServer(t)
	conn := dial(t, srv)

	send(t, conn, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	state := roomState(t, receive(t, conn))

	if len(state.Room.Code) != 4 {
		t.Errorf("code = %q, attendu 4 chiffres", state.Room.Code)
	}
	if len(state.Room.Players) != 1 || state.Room.Players[0].Name != "Alice" {
		t.Errorf("players = %+v, attendu [Alice]", state.Room.Players)
	}
}

func TestJoinAjouteLeJoueurEtDiffuseAuxDeux(t *testing.T) {
	srv := newTestServer(t)
	connA := dial(t, srv)
	connB := dial(t, srv)

	send(t, connA, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	created := roomState(t, receive(t, connA))

	send(t, connB, protocol.TypeJoin, protocol.JoinPayload{RoomCode: created.Room.Code, PlayerName: "Bob"})

	// Bob rejoint : les deux clients reçoivent le nouvel état à deux joueurs.
	stateForA := roomState(t, receive(t, connA))
	stateForB := roomState(t, receive(t, connB))

	for _, s := range []protocol.RoomStatePayload{stateForA, stateForB} {
		if len(s.Room.Players) != 2 {
			t.Errorf("players = %+v, attendu 2 joueurs", s.Room.Players)
		}
	}
}

func TestRecreerUneRoomQuitteLaPrecedente(t *testing.T) {
	srv := newTestServer(t)
	alice := dial(t, srv)

	send(t, alice, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	firstRoom := roomState(t, receive(t, alice))

	// Alice recree une room sans avoir quitte la premiere : elle doit en
	// sortir, sinon celle-ci garde une entree fantome et n'expire jamais.
	send(t, alice, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	roomState(t, receive(t, alice)) // deuxieme room, pas verifiee ici

	carol := dial(t, srv)
	send(t, carol, protocol.TypeJoin, protocol.JoinPayload{RoomCode: firstRoom.Room.Code, PlayerName: "Carol"})
	afterJoin := roomState(t, receive(t, carol))

	if len(afterJoin.Room.Players) != 1 {
		t.Errorf("players = %+v, attendu [Carol] seule (Alice fantome de la premiere room)", afterJoin.Room.Players)
	}
}

func TestJoinRoomInconnueRenvoieUneErreur(t *testing.T) {
	srv := newTestServer(t)
	conn := dial(t, srv)

	send(t, conn, protocol.TypeJoin, protocol.JoinPayload{RoomCode: "0000", PlayerName: "Bob"})
	env := receive(t, conn)

	if env.Type != protocol.TypeError {
		t.Fatalf("type = %q, attendu %q", env.Type, protocol.TypeError)
	}
}

// Les deux tests suivants vérifient le TTL par la frontière WebSocket
// (tenter un join), jamais en lisant les champs internes du Hub depuis la
// goroutine de test : ce serait exactement la data race documentée dans
// hub.go (rooms n'est touchée que par Run).

func TestRoomEncoreJoignableAvantLeDelaiDeGrace(t *testing.T) {
	srv := newTestServer(t)

	creator := dial(t, srv)
	send(t, creator, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	created := roomState(t, receive(t, creator))
	creator.CloseNow() // seule joueuse partie : le délai de grâce démarre

	time.Sleep(testRoomExpiryGrace / 3)

	joiner := dial(t, srv)
	send(t, joiner, protocol.TypeJoin, protocol.JoinPayload{RoomCode: created.Room.Code, PlayerName: "Bob"})
	env := receive(t, joiner)

	if env.Type != protocol.TypeRoomState {
		t.Fatalf("type = %q, attendu %q (room supprimee trop tot)", env.Type, protocol.TypeRoomState)
	}
}

func TestLeaveDuCreateurFermeLaSalleEtPrevientLesAutres(t *testing.T) {
	srv := newTestServer(t)
	creator := dial(t, srv)
	other := dial(t, srv)

	send(t, creator, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	created := roomState(t, receive(t, creator))

	send(t, other, protocol.TypeJoin, protocol.JoinPayload{RoomCode: created.Room.Code, PlayerName: "Bob"})
	receive(t, creator) // room_state a deux joueurs, pas verifie ici
	receive(t, other)   // idem cote Bob

	send(t, creator, protocol.TypeLeave, struct{}{})

	env := receive(t, other)
	if env.Type != protocol.TypeRoomClosed {
		t.Fatalf("type = %q, attendu %q", env.Type, protocol.TypeRoomClosed)
	}
	var payload protocol.RoomClosedPayload
	if err := json.Unmarshal(env.Data, &payload); err != nil {
		t.Fatalf("decodage room_closed: %v", err)
	}
	if payload.Message == "" {
		t.Error("message vide, attendu une explication affichable")
	}

	// writeLoop ferme la connexion juste apres avoir ecrit room_closed : une
	// lecture ulterieure doit echouer plutot que rester bloquee ou recevoir
	// autre chose.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, _, err := other.Read(ctx); err == nil {
		t.Error("lecture apres room_closed : attendu une erreur (connexion fermee), rien recu")
	}
}

func TestLeaveDunNonCreateurNeFermePasLaSalle(t *testing.T) {
	srv := newTestServer(t)
	creator := dial(t, srv)
	other := dial(t, srv)

	send(t, creator, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	created := roomState(t, receive(t, creator))

	send(t, other, protocol.TypeJoin, protocol.JoinPayload{RoomCode: created.Room.Code, PlayerName: "Bob"})
	receive(t, creator)
	receive(t, other)

	send(t, other, protocol.TypeLeave, struct{}{})

	state := roomState(t, receive(t, creator))
	if len(state.Room.Players) != 1 || state.Room.Players[0].Name != "Alice" {
		t.Errorf("players = %+v, attendu [Alice] seule (Bob n'est pas le createur)", state.Room.Players)
	}
}

func TestDeconnexionDuCreateurNeFermePasLaSalle(t *testing.T) {
	srv := newTestServer(t)
	creator := dial(t, srv)
	other := dial(t, srv)

	send(t, creator, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	created := roomState(t, receive(t, creator))

	send(t, other, protocol.TypeJoin, protocol.JoinPayload{RoomCode: created.Room.Code, PlayerName: "Bob"})
	receive(t, creator)
	receive(t, other)

	creator.CloseNow() // coupure, pas un depart volontaire : la salle doit survivre

	state := roomState(t, receive(t, other))
	if len(state.Room.Players) != 1 || state.Room.Players[0].Name != "Bob" {
		t.Errorf("players = %+v, attendu [Bob] seul (Alice deconnectee, salle pas fermee)", state.Room.Players)
	}
}

func TestRoomExpireApresLeDelaiDeGraceSiToujoursVide(t *testing.T) {
	srv := newTestServer(t)

	creator := dial(t, srv)
	send(t, creator, protocol.TypeCreate, protocol.CreatePayload{PlayerName: "Alice"})
	created := roomState(t, receive(t, creator))
	creator.CloseNow() // seule joueuse partie : le délai de grâce démarre

	time.Sleep(testRoomExpiryGrace * 4)

	joiner := dial(t, srv)
	send(t, joiner, protocol.TypeJoin, protocol.JoinPayload{RoomCode: created.Room.Code, PlayerName: "Bob"})
	env := receive(t, joiner)

	if env.Type != protocol.TypeError {
		t.Fatalf("type = %q, attendu %q (room jamais expiree)", env.Type, protocol.TypeError)
	}
}
