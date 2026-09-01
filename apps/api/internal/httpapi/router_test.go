package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/config"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/hub"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/protocol"
)

const allowedOrigin = "les-bons-comptes.example"

// Config explicite plutot que config.Load() : celle-ci lit l'environnement, et
// un ALLOWED_ORIGINS defini sur la machine qui lance les tests changerait
// silencieusement ce que les tests verifient.
func newTestRouter() http.Handler {
	cfg := config.Config{
		Addr:            ":0",
		AllowedOrigins:  []string{allowedOrigin},
		ShutdownTimeout: time.Second,
	}
	return NewRouter(hub.New(slog.New(slog.DiscardHandler)), cfg, slog.New(slog.DiscardHandler))
}

// wsRequest fabrique une requete d'upgrade complete ; seule l'origine varie
// d'un test a l'autre.
func wsRequest(origin string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/ws", nil)
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	req.Header.Set("Sec-WebSocket-Version", "13")
	req.Header.Set("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")
	req.Header.Set("Origin", origin)
	return req
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

// Ce que les deux tests suivants peuvent verifier, et pourquoi ils regardent le
// code exact : httptest.ResponseRecorder n'implemente pas http.Hijacker, donc
// l'upgrade echoue ici quoi qu'il arrive (501). Se contenter d'assurer
// « pas de 101 » passerait donc meme avec la verification d'origine desactivee.
// On teste le refus lui-meme : 403 pour une origine rejetee, et pas 403 pour
// une origine autorisee.
func TestWSRefuseUneOrigineInconnue(t *testing.T) {
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, wsRequest("http://attaquant.example"))

	if rec.Code != http.StatusForbidden {
		t.Fatalf("statut = %d, attendu %d pour une origine non autorisee",
			rec.Code, http.StatusForbidden)
	}
}

func TestWSLaisssePasserUneOrigineAutorisee(t *testing.T) {
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, wsRequest("https://"+allowedOrigin))

	// 501 : la verification d'origine est passee, seul le hijacker manque. Un
	// 403 signalerait que la liste d'origines ne reconnait plus le site web.
	if rec.Code != http.StatusNotImplemented {
		t.Fatalf("statut = %d, attendu %d (origine autorisee)",
			rec.Code, http.StatusNotImplemented)
	}
}
