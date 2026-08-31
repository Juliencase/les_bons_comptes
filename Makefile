# Point d'entrée unique du monorepo.
#
# Deux toolchains cohabitent — npm pour l'app mobile et le package partagé, go
# pour l'API — donc ni l'un ni l'autre ne peut servir d'orchestrateur. Make
# donne un vocabulaire commun : `make check` avant de pousser, et c'est tout ce
# qu'il y a à retenir.
#
# `make` liste les cibles disponibles.

API    := apps/api
SHARED := packages/shared

# Go a besoin de son cache ; sous Git Bash sur Windows, %LocalAppData% n'est pas
# toujours exporté, ce qui fait échouer go build avec « GOCACHE is not defined ».
export GOCACHE ?= $(HOME)/.cache/go-build

.DEFAULT_GOAL := help

.PHONY: help install dev-mobile dev-api generate check check-js check-go \
        check-generated test test-js test-go test-race lint fmt

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances des deux toolchains
	npm install
	cd $(API) && go mod download

dev-mobile: ## Lance le serveur de dev Expo
	npm run start -w @lbc/mobile

dev-api: ## Lance l'API en local (port 8080 par défaut)
	cd $(API) && go run ./cmd/server

generate: ## Régénère les types TS depuis les structs Go
	cd $(API) && go tool tygo generate

check: check-js check-go check-generated ## Tout vérifier avant de pousser

check-js: ## tsc + jest + eslint
	npm run typecheck
	npm test
	npm run lint

check-go: ## gofmt + vet + tests
	@cd $(API) && out=$$(gofmt -l .); \
		if [ -n "$$out" ]; then echo "gofmt — fichiers non formates :"; echo "$$out"; exit 1; fi
	cd $(API) && go vet ./...
	cd $(API) && go test ./...

check-generated: generate ## Échoue si le TS généré a dérivé du Go
	@git diff --exit-code $(SHARED)/src/generated \
		|| (echo ""; echo "Les types generes ont derive : commite le resultat de 'make generate'."; exit 1)

test: test-js test-go ## Tous les tests

test-js: ## Tests Jest
	npm test

test-go: ## Tests Go
	cd $(API) && go test ./...

test-race: ## Tests Go avec le detecteur de races (requiert cgo + un compilateur C)
	cd $(API) && CGO_ENABLED=1 go test -race ./...

lint: ## eslint sur le JS/TS
	npm run lint

fmt: ## Reformate le JS/TS et le Go
	npm run format
	cd $(API) && gofmt -w .
