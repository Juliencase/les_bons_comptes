# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this is

**Les Bons Comptes** — a monorepo hosting a score-keeping app for card and
board games, and the Go backend it is growing into.

```
apps/mobile/       React Native (Expo) app — the whole product today
apps/api/          Go WebSocket server — skeleton, not wired to the app yet
packages/shared/   TypeScript contract, generated from the Go structs
docs/              Game rules + design charter (shared reference)
```

Each of the three has its own `CLAUDE.md` with the detail that matters when
you are inside it. **Read the one for the directory you are about to touch** —
this file only covers what spans them.

The app is local-only and offline: game state lives on-device in AsyncStorage.
`apps/api` exists so that shared/synchronised games become possible later, and
as a deliberate Go learning exercise (see `apps/api/CLAUDE.md` — some of it is
scaffolded on purpose and must **not** be written for the user).

## Layout and why it is this way

**npm workspaces** (`apps/mobile`, `packages/*`) — no Turborepo, no pnpm. One
lockfile, one `node_modules` at the root, dependencies hoisted. The Go module
lives outside that entirely: `apps/api` is a standalone `go.mod`, and npm knows
nothing about it.

Because two toolchains cohabit, neither can orchestrate the other — that is
what the root **`Makefile`** is for. `make` on its own lists the targets; the
one to remember is `make check` before pushing.

```
make install        # npm install + go mod download
make dev-mobile     # expo start
make dev-api        # go run ./cmd/server  (port 8080)
make generate       # regenerate the TS contract from the Go structs
make check          # everything: JS gates + Go gates + contract drift
make test           # jest + go test
make fmt            # prettier + gofmt
```

Two environment quirks on Windows/Git Bash:

- `ComSpec` is sometimes empty, and npm then fails to spawn lifecycle scripts
  with a cryptic `ERR_INVALID_ARG_TYPE`. Fix in the current shell:
  `export ComSpec="C:\\Windows\\System32\\cmd.exe"`. The `Makefile` does **not**
  set this — it would be wrong on Linux/macOS.
- Go needs `GOCACHE`; if `%LocalAppData%` is not exported, `go build` fails
  with "GOCACHE is not defined". The `Makefile` sets a default for it.

## The contract between front and back

The Go structs in **`apps/api/internal/protocol/`** are the single source of
truth for anything crossing the wire. `tygo` translates them into
`packages/shared/src/generated/protocol.ts`, which is **committed** so that the
TypeScript side never needs a Go toolchain to build.

The rule that follows: **never hand-edit anything under
`packages/shared/src/generated/`.** Change the Go struct, run `make generate`,
commit both. CI enforces this — the `contract` job regenerates and fails on any
diff.

`packages/shared/src/index.ts` is hand-written and re-exports the generated
types, plus the few things tygo cannot express (it flattens `type X string`
into a plain `string`, losing the union). That file is the import surface;
consumers import `@lbc/shared`, never the generated file directly.

## Gates

`make check` runs locally what CI runs on every push and PR
(`.github/workflows/ci.yml`):

| Side | Gate |
| --- | --- |
| JS/TS | `npm run typecheck`, `npm test`, `npm run lint` |
| Go | `gofmt -l .`, `go vet ./...`, `go test -race ./...` |
| Contract | `make generate` then `git diff --exit-code` on the generated TS |

**`go test -race` only runs in CI.** It needs cgo and a C compiler, which the
usual Windows dev box does not have — `make test-go` (no `-race`) is the local
equivalent, and `make test-race` will fail with "requires cgo" unless mingw is
installed. Don't claim the race detector passed based on a local run.

`.githooks/pre-commit` auto-fixes ESLint/Prettier and restages, blocking only
on a remaining ESLint error, runs `gofmt -w` on staged `.go` files and
restages those too, and runs `gitleaks protect --staged` when available.
Activate it with `git config core.hooksPath .githooks`.

## Deployment

`.github/workflows/deploy.yml` deploys to a Raspberry Pi on push to `main`;
`docker-compose.yml` describes both services behind Traefik
(`les-bons-comptes.valodin.fr` for the web build, `lbc-api.valodin.fr` for
the API — one label deep, because Cloudflare's free certificate covers
`*.valodin.fr` and its wildcard matches a single label). Both Dockerfiles take the
**repo root as build context** — the lockfile and workspace manifests live
there, so a context of `apps/mobile` would break `npm ci`.

The Android APK is built by a third workflow, `.github/workflows/eas-build.yml`
(EAS, Android `preview` profile), triggered when a **pull request is merged**
into `main` — not on a direct push to `main`, and not by `deploy.yml`. It runs
on a GitHub runner, not the Pi, and needs the `EXPO_TOKEN` repo secret.
`npm run update-apk` from `apps/mobile` is the manual equivalent.

## Agentic setup

`.claude/agents/` holds two specialists, and they are not used the same way:

- **`react-native-expert`** — executes. Delegate component/screen/hook work,
  refactors, and anything where clean code and architecture matter in
  `apps/mobile`.
- **`go-expert`** — **teaches, and does not write the interesting code.** The
  Go backend exists partly so the user learns Go. It explains, reviews, and
  writes boilerplate, but concurrency (`internal/hub/`, `internal/game/`) is
  the user's to write. See `apps/api/CLAUDE.md` for exactly where that line
  sits.

`.claude/skills/task` (`/task`) orchestrates a full feature/fix flow with
approval checkpoints.

## Conventions (both sides)

- **Conventional Commits**: `type(scope): description`, all lowercase, no
  trailing period. Scope is optional but useful here to say which side is
  touched — `feat(api):`, `fix(mobile):`, `chore(shared):`.
- **Never** add a `Co-Authored-By` trailer or any mention of Claude to a commit
  message.
- Comments and UI copy are in **French**; match the surrounding language when
  editing nearby code or docs. Identifiers stay in English.
- Nothing is pushed without the user asking for it.
