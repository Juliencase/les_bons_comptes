# Image de l'API Go.
#
# Contexte de build = racine du monorepo, comme pour l'app mobile
# (cf. `docker-compose.yml`), pour que les deux images se pilotent pareil.
FROM golang:1.26-alpine AS build
WORKDIR /src

# Manifestes d'abord : cette couche ne se réinvalide que si les deps changent.
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api .
# CGO désactivé + distroless `static` : le binaire ne dépend d'aucune libc.
# -trimpath retire les chemins de build, -s -w les tables de symboles.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# `static` (et pas `base`) : rien d'autre que le binaire, pas de shell.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
