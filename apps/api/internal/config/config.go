// Package config lit la configuration du serveur depuis l'environnement.
package config

import (
	"os"
	"strings"
	"time"
)

// Config regroupe tout ce que le serveur lit de son environnement. Pas de
// valeur par défaut cachée ailleurs dans le code : tout est ici.
type Config struct {
	// Addr est l'adresse d'écoute, au format accepté par net/http.
	Addr string

	// AllowedOrigins liste les origines autorisées à ouvrir un WebSocket.
	//
	// À quoi ça sert : un navigateur envoie un en-tête `Origin` sur la requête
	// d'upgrade, et sans vérification n'importe quel site tiers pourrait ouvrir
	// une socket vers l'API avec les cookies de l'utilisateur. L'app mobile
	// native, elle, n'envoie pas d'`Origin` du tout — ce cas reste accepté.
	AllowedOrigins []string

	// ShutdownTimeout borne l'arrêt gracieux : au-delà, on coupe.
	ShutdownTimeout time.Duration

	// DBPath est le chemin du fichier SQLite dédié à ce service (voir
	// internal/roomstore) — jamais partagé avec un autre projet du Pi. Le
	// défaut de développement local crée un dossier `data/` à côté du code ;
	// en conteneur, DB_PATH pointe sur un volume nommé dédié (voir
	// docker-compose.yml).
	DBPath string
}

// Load construit la Config depuis l'environnement, avec des valeurs par défaut
// utilisables en développement local.
func Load() Config {
	return Config{
		Addr:            ":" + env("PORT", "8080"),
		AllowedOrigins:  splitAndTrim(env("ALLOWED_ORIGINS", "localhost:8081")),
		ShutdownTimeout: 10 * time.Second,
		DBPath:          env("DB_PATH", "./data/rooms.db"),
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// splitAndTrim découpe une liste séparée par des virgules en ignorant les
// entrées vides, pour qu'un `ALLOWED_ORIGINS="a, ,b"` ne produise pas une
// origine vide qui matcherait n'importe quoi.
func splitAndTrim(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
