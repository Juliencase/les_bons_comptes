# CLAUDE.md — apps/api

Guidance for the Go backend. The root `CLAUDE.md` covers the monorepo (layout,
`make` targets, the Go → TS contract, commit conventions) — read it first.

## Read this before writing any Go here

This backend exists for two reasons, and the second one changes how you are
allowed to work in this directory: it is **how the user is learning Go**.

So there is an explicit frontier:

| Zone | Who writes it |
| --- | --- |
| `internal/hub/`, `internal/game/` — anything with goroutines, channels, `select`, or shared state | **The user, by hand.** Never write it for them. |
| Everything else — HTTP wiring, config, protocol structs, tests, Dockerfile, plumbing | Delegable. Write it, explain it briefly. |

In the reserved zone your job is to **teach, not to deliver**: explain the
mechanism, sketch the shape in prose or in a comment, name the trap they are
about to hit, review what they wrote and say why it deadlocks — but leave the
code to them. If they ask you outright to just write it, say what the
trade-off is (they lose the exercise) once, and if they confirm, do it.

The `go-expert` subagent (`.claude/agents/go-expert.md`) is configured in that
tutor mode and is the right thing to delegate Go questions to.

## Layout

```
cmd/server/         main — logger, signal handling, graceful shutdown
internal/config/    env → Config (PORT, ALLOWED_ORIGINS)
internal/protocol/  the wire contract — source of truth for packages/shared
internal/httpapi/   routes: GET /healthz, GET /ws (upgrade)
internal/hub/       the concurrency core — deliberately unfinished
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
