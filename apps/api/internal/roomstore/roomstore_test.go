package roomstore

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

// open ouvre un Store sur un fichier temporaire, fermé automatiquement à la
// fin du test. Un vrai fichier (pas `:memory:`) : c'est le mode WAL, exercé
// ici comme en production, qui a le plus de chances de révéler un souci.
func open(t *testing.T) *Store {
	t.Helper()
	s, err := Open(filepath.Join(t.TempDir(), "rooms.db"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestCreatePuisListeLaSalle(t *testing.T) {
	s := open(t)
	createdAt := time.Now().Truncate(time.Second)
	players := []protocol.Player{{ID: "c1", Name: "Alice"}}

	if err := s.Create("1234", "Alice", players, createdAt); err != nil {
		t.Fatalf("Create: %v", err)
	}

	rooms, err := s.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(rooms) != 1 {
		t.Fatalf("rooms = %+v, attendu 1 salle", rooms)
	}
	got := rooms[0]
	if got.Code != "1234" || got.CreatorName != "Alice" || got.CreatedAt != createdAt.Unix() {
		t.Errorf("snapshot = %+v, attendu code=1234 creator=Alice createdAt=%d", got, createdAt.Unix())
	}
	if len(got.Players) != 1 || got.Players[0].Name != "Alice" {
		t.Errorf("players = %+v, attendu [Alice]", got.Players)
	}
}

func TestUpdatePlayersReussitLaListeMaisPasLeCreateur(t *testing.T) {
	s := open(t)
	createdAt := time.Now()

	if err := s.Create("1234", "Alice", []protocol.Player{{ID: "c1", Name: "Alice"}}, createdAt); err != nil {
		t.Fatalf("Create: %v", err)
	}

	newPlayers := []protocol.Player{
		{ID: "c1", Name: "Alice"},
		{ID: "c2", Name: "Bob"},
	}
	if err := s.UpdatePlayers("1234", newPlayers); err != nil {
		t.Fatalf("UpdatePlayers: %v", err)
	}

	rooms, err := s.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(rooms) != 1 {
		t.Fatalf("rooms = %+v, attendu 1 salle", rooms)
	}
	got := rooms[0]
	if got.CreatorName != "Alice" {
		t.Errorf("creatorName = %q, attendu qu'il ne bouge pas malgre UpdatePlayers", got.CreatorName)
	}
	if len(got.Players) != 2 {
		t.Errorf("players = %+v, attendu 2 joueurs", got.Players)
	}
}

func TestUpdatePlayersSurSalleInconnueNeFaitRien(t *testing.T) {
	s := open(t)
	if err := s.UpdatePlayers("0000", []protocol.Player{}); err != nil {
		t.Fatalf("UpdatePlayers sur salle inconnue: %v", err)
	}
}

func TestDeleteRetireLaSalle(t *testing.T) {
	s := open(t)
	if err := s.Create("1234", "Alice", []protocol.Player{{ID: "c1", Name: "Alice"}}, time.Now()); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := s.Delete("1234"); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	rooms, err := s.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(rooms) != 0 {
		t.Errorf("rooms = %+v, attendu aucune salle apres Delete", rooms)
	}
}

func TestDeleteSurSalleInconnueNeFaitRien(t *testing.T) {
	s := open(t)
	if err := s.Delete("0000"); err != nil {
		t.Fatalf("Delete sur salle inconnue: %v", err)
	}
}

func TestOpenPurgeLesSallesDunProcessusPrecedent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "rooms.db")

	s1, err := Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if err := s1.Create("1234", "Alice", []protocol.Player{{ID: "c1", Name: "Alice"}}, time.Now()); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if err := s1.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}

	// Un nouveau Open sur le même fichier simule un redémarrage du serveur :
	// le Hub qui l'accompagne repart toujours avec `rooms` vide en mémoire
	// (voir la doc du paquet), donc la salle laissée par le processus
	// précédent doit disparaître ici plutôt que de rester une salle fantôme.
	s2, err := Open(path)
	if err != nil {
		t.Fatalf("Open (reouverture): %v", err)
	}
	t.Cleanup(func() { s2.Close() })

	rooms, err := s2.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(rooms) != 0 {
		t.Errorf("rooms = %+v, attendu aucune salle apres reouverture", rooms)
	}
}

func TestListSansSalleRenvoieUneListeVide(t *testing.T) {
	s := open(t)
	rooms, err := s.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if rooms == nil || len(rooms) != 0 {
		t.Errorf("rooms = %+v, attendu une liste vide (non nil)", rooms)
	}
}
