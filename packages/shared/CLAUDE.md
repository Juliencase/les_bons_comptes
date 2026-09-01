# CLAUDE.md — packages/shared

The TypeScript view of the wire contract. Root `CLAUDE.md` has the monorepo
context.

## The one rule

**`src/generated/` is machine-written. Never edit it by hand.**

Its contents come from the Go structs in `apps/api/internal/protocol/`, via
`tygo`. To change anything in there:

1. edit the Go struct in `apps/api/internal/protocol/messages.go`,
2. run `make generate` from the repo root,
3. commit the Go change **and** the regenerated TypeScript together.

CI has a job that regenerates and fails on any diff, so a hand-edit doesn't
survive — it just turns into a red build for whoever pushes next.

Two things guard that from the tooling side, because "never edit it" also
means "no tool may edit it": `.prettierignore` at the repo root keeps
`npm run format` / `make fmt` off this directory (Prettier would rewrite
tygo's double quotes into single ones and hand you a red `contract` job), and
`.githooks/pre-commit` excludes the same path from its `prettier --write` pass.

## What is hand-written

`src/index.ts` only. It re-exports everything generated and adds what tygo
cannot express — currently `KNOWN_MESSAGE_TYPES` (the single list the union and
its guard both derive from) and the shape guard `isEnvelope`, since
tygo flattens `type MessageType string` into a plain `string` and loses the
allowed values.

Consumers import `@lbc/shared`; nothing should import
`@lbc/shared/src/generated/protocol` directly, so that the compensation layer
is never bypassed.

## Notes

- No build step: `main`/`types` point straight at `src/index.ts` and the app's
  bundler compiles it. That keeps the package free of a `dist/` to keep in
  sync, at the cost of it being consumable only from a TS toolchain — fine, it
  has exactly one consumer.
- `npm run typecheck` here checks the package in isolation; the root
  `npm run typecheck` runs it across all workspaces.
- This package has no test runner of its own. The guards in `src/index.ts` are
  tested from the consumer side, in `apps/mobile/src/lib/shared.test.ts`, which
  doubles as the check that a build-step-less TS package still resolves and
  transforms correctly from the app.
- Nothing in this package may import from `apps/mobile` — the dependency
  points one way only.
