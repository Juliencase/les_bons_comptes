// Package httpapi expose le routage HTTP : les endpoints classiques et le
// point d'entrée WebSocket.
package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/coder/websocket"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/config"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/hub"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/roomstore"
)

// adminRoomLister est ce que le handler admin attend du store — juste de quoi
// lister, jamais de quoi muter (seul Hub.Run persiste, voir internal/hub).
// Interface plutôt que *roomstore.Store en dur : ça garde le handler testable
// sans fichier SQLite réel si besoin plus tard.
type adminRoomLister interface {
	List() ([]protocol.AdminRoomSnapshot, error)
}

var _ adminRoomLister = (*roomstore.Store)(nil)

// NewRouter câble les routes. Les motifs incluent la méthode (`GET /...`),
// syntaxe supportée par net/http depuis Go 1.22 — pas besoin d'un routeur tiers.
func NewRouter(h *hub.Hub, store adminRoomLister, cfg config.Config, logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("GET /ws", handleWS(h, cfg, logger))
	mux.HandleFunc("GET /admin/rooms", handleAdminRooms(store, logger))
	return mux
}

type healthResponse struct {
	Status string `json:"status"`
	// Permet à un client de détecter qu'il parle à un serveur trop récent
	// avant même d'ouvrir une socket.
	ProtocolVersion int `json:"protocolVersion"`
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{
		Status:          "ok",
		ProtocolVersion: protocol.Version,
	})
}

// handleAdminRooms expose l'état persisté des salles (internal/roomstore),
// pour une vue de debug qui ne dépend pas de ce qu'un client mobile croit
// avoir en session. Sans authentification, à dessein : voir CLAUDE.md.
func handleAdminRooms(store adminRoomLister, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		rooms, err := store.List()
		if err != nil {
			logger.Error("liste des salles admin echouee", "err", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, protocol.AdminRoomsResponse{Rooms: rooms})
	}
}

// handleWS fait l'upgrade puis confie la connexion au hub.
//
// La frontière est ici : cette fonction ne fait que de la plomberie HTTP
// (négociation, vérification d'origine). Tout ce qui suit l'upgrade — lecture,
// diffusion, cycle de vie — appartient au hub.
func handleWS(h *hub.Hub, cfg config.Config, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			// Sans cette liste, seules les requêtes de même origine passent.
			// L'app mobile native n'envoie pas d'en-tête Origin et reste
			// acceptée ; c'est la version web qui a besoin d'y figurer.
			OriginPatterns: cfg.AllowedOrigins,
		})
		if err != nil {
			// Accept a déjà répondu au client ; on ne fait que tracer.
			logger.Warn("upgrade websocket refuse", "err", err, "origin", r.Header.Get("Origin"))
			return
		}

		// Le hub prend possession de la connexion, fermeture comprise. On ne
		// rend la main qu'à la fin de la session : tant que ce handler tourne,
		// r.Context() reste vivant.
		h.HandleConn(r.Context(), conn)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		// L'en-tête est déjà parti : plus rien à faire pour ce client.
		return
	}
}
