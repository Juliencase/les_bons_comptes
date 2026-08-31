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

## What is hand-written

`src/index.ts` only. It re-exports everything generated and adds what tygo
cannot express — currently the `MessageType` union and its type guards, since
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
- Nothing in this package may import from `apps/mobile` — the dependency
  points one way only.
