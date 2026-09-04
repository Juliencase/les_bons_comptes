// Package roomstore persiste les salles multijoueur dans un fichier SQLite
// dédié à ce service — jamais partagé avec un autre projet du Pi, pour ne
// jamais risquer une écriture concurrente par deux services différents sur
// le même fichier.
//
// Rôle : donner à GET /admin/rooms une vue fiable de l'état réel du serveur,
// plutôt que de se fier à la session locale que le client mobile persiste de
// son côté (voir apps/mobile/src/lib/store.ts, roomSession). Ce n'est PAS un
// mécanisme de reprise après redémarrage : le Hub ne recharge rien depuis ce
// store à son démarrage, il ne fait qu'y écrire au fil des événements. Un
// redémarrage du serveur continue donc de vider toutes les salles en mémoire
// comme avant ; seule la trace SQLite change.
//
// Écrit uniquement depuis Hub.Run (une seule goroutine, voir la doc du
// paquet hub) : les méthodes de mutation (Create/UpdatePlayers/Delete) n'ont
// donc pas besoin de synchronisation côté appelant. List, elle, est appelée
// depuis le handler HTTP admin, dans sa propre goroutine par requête — safe
// par construction : *sql.DB gère lui-même la concurrence, et le mode WAL
// laisse les lectures continuer pendant une écriture.
package roomstore

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite" // driver pur Go : pas de cgo, compatible avec l'image distroless CGO_ENABLED=0.

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

// Store donne accès au fichier SQLite des salles.
type Store struct {
	db *sql.DB
}

// Open crée (si besoin) le dossier et le fichier à path, puis la table
// `rooms` si elle n'existe pas encore.
func Open(path string) (*Store, error) {
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("creation du dossier %q: %w", dir, err)
		}
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("ouverture sqlite %q: %w", path, err)
	}

	// WAL : les lectures de l'endpoint admin ne bloquent jamais une écriture
	// du hub, et inversement.
	if _, err := db.Exec(`PRAGMA journal_mode = WAL`); err != nil {
		db.Close()
		return nil, fmt.Errorf("activation WAL: %w", err)
	}

	const schema = `
		CREATE TABLE IF NOT EXISTS rooms (
			code TEXT PRIMARY KEY,
			creator_name TEXT NOT NULL,
			players_json TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)`
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("creation du schema: %w", err)
	}

	// Le Hub ne recharge jamais son état depuis ce fichier (voir la doc du
	// paquet) : il démarre toujours avec `rooms` vide en mémoire. Sans ce
	// nettoyage, une salle encore active au moment d'un redémarrage
	// (redéploiement sur push, ou tout arrêt non gracieux) resterait
	// indéfiniment dans ce fichier — le code de la salle n'étant quasiment
	// jamais retiré par le hasard d'un futur newRoomCode(), plus aucun
	// événement ne la revisiterait jamais pour la supprimer. On vide donc la
	// table à l'ouverture, pour que GET /admin/rooms reflète l'état réel dès
	// le démarrage plutôt que d'accumuler des salles fantômes à chaque
	// déploiement.
	if _, err := db.Exec(`DELETE FROM rooms`); err != nil {
		db.Close()
		return nil, fmt.Errorf("purge des salles au demarrage: %w", err)
	}

	return &Store{db: db}, nil
}

// Close ferme le fichier SQLite sous-jacent.
func (s *Store) Close() error {
	return s.db.Close()
}

// Create insère une salle nouvellement créée. `creatorName` et `createdAt`
// sont figés à la création : contrairement aux joueurs (voir UpdatePlayers),
// ils ne changent jamais pendant la vie de la salle, même si le créateur se
// déconnecte sans la fermer.
func (s *Store) Create(code, creatorName string, players []protocol.Player, createdAt time.Time) error {
	playersJSON, err := json.Marshal(players)
	if err != nil {
		return fmt.Errorf("encodage players pour %q: %w", code, err)
	}

	// ON CONFLICT couvre uniquement le cas d'un code de room réutilisé après
	// redémarrage du serveur (h.rooms repart vide en mémoire, mais le fichier
	// SQLite survit sur son volume dédié) : la ligne existante appartient
	// alors à une salle différente et disparue, donc created_at doit lui
	// aussi être rafraîchi — pas seulement creator_name/players_json.
	_, err = s.db.Exec(
		`INSERT INTO rooms (code, creator_name, players_json, created_at) VALUES (?, ?, ?, ?)
		 ON CONFLICT(code) DO UPDATE SET creator_name = excluded.creator_name, players_json = excluded.players_json, created_at = excluded.created_at`,
		code, creatorName, string(playersJSON), createdAt.Unix(),
	)
	if err != nil {
		return fmt.Errorf("insertion de %q: %w", code, err)
	}
	return nil
}

// UpdatePlayers reflète un changement de composition d'une salle existante
// (join, départ d'un joueur non-créateur). No-op silencieux si `code`
// n'existe pas (déjà supprimée entre-temps côté hub) : ce n'est pas une
// erreur à faire remonter.
func (s *Store) UpdatePlayers(code string, players []protocol.Player) error {
	playersJSON, err := json.Marshal(players)
	if err != nil {
		return fmt.Errorf("encodage players pour %q: %w", code, err)
	}

	if _, err := s.db.Exec(
		`UPDATE rooms SET players_json = ? WHERE code = ?`,
		string(playersJSON), code,
	); err != nil {
		return fmt.Errorf("mise a jour des joueurs de %q: %w", code, err)
	}
	return nil
}

// Delete retire une salle fermée ou expirée. No-op si elle n'existe déjà
// plus.
func (s *Store) Delete(code string) error {
	if _, err := s.db.Exec(`DELETE FROM rooms WHERE code = ?`, code); err != nil {
		return fmt.Errorf("suppression de %q: %w", code, err)
	}
	return nil
}

// List renvoie toutes les salles actuellement persistées, pour GET
// /admin/rooms.
func (s *Store) List() ([]protocol.AdminRoomSnapshot, error) {
	rows, err := s.db.Query(
		`SELECT code, creator_name, players_json, created_at FROM rooms ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("liste des salles: %w", err)
	}
	defer rows.Close()

	snapshots := make([]protocol.AdminRoomSnapshot, 0)
	for rows.Next() {
		var (
			snap        protocol.AdminRoomSnapshot
			playersJSON string
		)
		if err := rows.Scan(&snap.Code, &snap.CreatorName, &playersJSON, &snap.CreatedAt); err != nil {
			return nil, fmt.Errorf("lecture d'une ligne: %w", err)
		}
		if err := json.Unmarshal([]byte(playersJSON), &snap.Players); err != nil {
			return nil, fmt.Errorf("decodage players de %q: %w", snap.Code, err)
		}
		snapshots = append(snapshots, snap)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("parcours des salles: %w", err)
	}
	return snapshots, nil
}
