package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/config"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/hub"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

func newTestRouter() http.Handler {
	return NewRouter(hub.New(), config.Load(), slog.New(slog.DiscardHandler))
}

func TestHealthRepondOK(t *testing.T) {
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("statut = %d, attendu %d", rec.Code, http.StatusOK)
	}

	var got healthResponse
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("corps illisible : %v", err)
	}
	if got.Status != "ok" {
		t.Errorf("status = %q, attendu %q", got.Status, "ok")
	}
	// Garde-fou : la version annoncée doit suivre le protocole, pas être figée.
	if got.ProtocolVersion != protocol.Version {
		t.Errorf("protocolVersion = %d, attendu %d", got.ProtocolVersion, protocol.Version)
	}
}

func TestWSRefuseUneOrigineInconnue(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/ws", nil)
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	req.Header.Set("Sec-WebSocket-Version", "13")
	req.Header.Set("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")
	req.Header.Set("Origin", "http://attaquant.example")

	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, req)

	if rec.Code == http.StatusSwitchingProtocols {
		t.Fatal("l'upgrade a ete accepte pour une origine non autorisee")
	}
}
