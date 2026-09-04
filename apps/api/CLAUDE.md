# CLAUDE.md — apps/api

Guidance for the Go backend. The root `CLAUDE.md` covers the monorepo (layout,
`make` targets, the Go → TS contract, commit conventions) — read it first.

## Read this before writing any Go here

This backend was originally scoped so that `internal/hub/` and
`internal/game/` (goroutines, channels, `select`, shared state) stayed a
hand-written learning exercise for the user, with everything else delegable.
That's retired: the user is now learning Go on a separate project and needs
this one to move fast, so **all of `apps/api` is delegable, `internal/hub/`
and `internal/game/` included.** Don't hold back on those packages or wait
for confirmation before writing concurrency code there.

The `go-expert` subagent (`.claude/agents/go-expert.md`) is configured for
this and is the right thing to delegate any Go work to.

## Layout

```
cmd/server/         main — logger, signal handling, graceful shutdown
internal/config/    env → Config (PORT, ALLOWED_ORIGINS, DB_PATH)
internal/protocol/  the wire contract — source of truth for packages/shared
internal/httpapi/   routes: GET /healthz, GET /ws (upgrade), GET /admin/rooms
internal/hub/       the concurrency core — deliberately unfinished
internal/roomstore/ SQLite-backed room persistence, feeds GET /admin/rooms
```

Nothing imports `internal/hub` except `internal/httpapi` (one call:
`HandleConn`) and `main` (one call: `Run`). That narrow surface is on purpose —
the hub can be rewritten from scratch without touching anything else.

## Commands

```
make dev-api            # go run ./cmd/server — listens on :8080
make check-go           # gofmt -l . + go vet ./... + go test ./...
make test-race          # go test -race ./...  (needs cgo + a C compiler)
make generate           # regenerate packages/shared from internal/protocol
cd apps/api && go tool tygo generate    # what `make generate` runs
```

**`-race` does not run on a plain Windows box** — it requires cgo and a C
toolchain. CI (ubuntu) is the real gate, and it is the gate that matters here,
since the whole point of the hub is concurrency. Never report the race
detector as passing from a local run that didn't actually execute it.

## Design decisions worth not undoing

- **`internal/protocol/` is the source of truth for the wire format.** Change a
  struct there, run `make generate`, commit the regenerated
  `packages/shared/src/generated/protocol.ts` alongside. tygo only handles flat
  structs and typed const blocks — keep the types simple, and don't expect it
  to preserve a `type X string` union (it collapses to `string`; the union is
  reconstructed by hand in `packages/shared/src/index.ts`).
- **`protocol.Version`** is echoed by `/healthz` and asserted by
  `internal/httpapi/router_test.go`. Bump it when the wire format changes
  incompatibly.
- **The HTTP server sets `ReadHeaderTimeout` and nothing else.** `ReadTimeout`
  and `WriteTimeout` are absent *on purpose*: they apply to the whole
  connection, so they would kill every WebSocket after N seconds. Per-message
  deadlines belong in the hub's read/write loops, not on the server.
- **Origin checking is explicit** (`websocket.Accept` with `OriginPatterns`
  from `ALLOWED_ORIGINS`). Native React Native sends no `Origin` header and is
  therefore always allowed; the list only constrains browsers, i.e. the web
  build. Don't "simplify" it to `InsecureSkipVerify`.
- **Graceful shutdown** via `signal.NotifyContext` + `srv.Shutdown`. The hub's
  `Run` takes the same context, so cancelling it must be what stops the hub —
  don't add a separate stop channel.
- **Routing is stdlib** (`http.ServeMux` with Go 1.22 method patterns like
  `"GET /ws"`). No router dependency; don't add one for two routes.
- **The Docker image is distroless `static` + `CGO_ENABLED=0`** — no shell, no
  libc, runs as `nonroot`. Anything needing cgo would break this.
- **`GET /admin/rooms` has no authentication, on purpose.** It reads
  `internal/roomstore` and exists so the mobile app's debug panel (and anyone
  else) can see the real state of active rooms instead of trusting what a
  client's local session claims. `les-bons-comptes.valodin.fr` is deliberately
  public with no login (see the root `CLAUDE.md`), so this endpoint is too — a
  room code is already the only thing needed to join a room, so this doesn't
  lower the bar further. Revisit only if room contents ever include something
  more sensitive than a code, a creator name, and player names. It also sends
  `Access-Control-Allow-Origin: *` — the web build fetches it from a
  different origin (its own dev server or `les-bons-comptes.valodin.fr`
  fetching `lbc-api.valodin.fr`), and CORS only exists to protect
  authenticated/sensitive responses from being read cross-origin, neither of
  which applies here.
- **`internal/roomstore`'s SQLite file is wiped on every `Open`.** The hub
  never reloads room state from it at startup (a restart always empties
  `Hub.rooms` in memory) — without the wipe, a room still open at the moment
  of a restart would linger in the file forever as a ghost row, since no
  future hub event would ever revisit that room code to delete it.

## Conventions

- `gofmt` is not negotiable (CI fails on any unformatted file). `go vet` clean.
- Comments in French, identifiers in English — same rule as the mobile app.
- Errors are wrapped with context (`fmt.Errorf("...: %w", err)`) and handled,
  never discarded with `_` unless the reason is written next to it.
- Logging is `log/slog` in JSON, one logger created in `main` and passed down.
  No package-level logger, no `log.Printf`.
- Prefer the standard library. Current non-stdlib dependencies:
  `coder/websocket` (runtime) and `tygo` (tool). Adding a third is a decision,
  not a reflex — say why.
