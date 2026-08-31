// Commande server : point d'entrée de l'API.
//
// Rôle unique : lire la config, câbler les composants, écouter, et s'arrêter
// proprement. Aucune logique métier ici.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/config"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/httpapi"
	"github.com/sidequest-stash/les-bons-comptes/apps/api/internal/hub"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg := config.Load()

	// ctx est annulé au premier SIGINT/SIGTERM — c'est le signal d'arrêt que
	// suivent à la fois le hub et le serveur HTTP.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	h := hub.New()
	go h.Run(ctx)

	srv := &http.Server{
		Addr:    cfg.Addr,
		Handler: httpapi.NewRouter(h, cfg, logger),
		// Volontairement pas de ReadTimeout ni de WriteTimeout : ils
		// couperaient les WebSockets, qui restent ouverts par nature.
		// ReadHeaderTimeout protège quand même contre un client qui n'envoie
		// jamais ses en-têtes.
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("serveur demarre", "addr", cfg.Addr, "origins", cfg.AllowedOrigins)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("echec de l'ecoute", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("arret demande, fermeture en cours")

	// Contexte neuf : celui d'origine est déjà annulé, il ne peut pas borner
	// l'arrêt.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("arret force avant la fin des requetes", "err", err)
		os.Exit(1)
	}
	logger.Info("arret propre")
}
