# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"Les Bons Comptes" — a React Native (Expo) mobile app for score-keeping card
and board games. It's built to eventually host several games (see `GamesScreen`
and its `GAMES` list, designed to grow); **Skull King** is the only one
implemented so far. Local-only, offline, no backend: game state is persisted
on-device via AsyncStorage. Full Skull King rules (used to derive its scoring
engine) are in [docs/REGLES_SKULL_KING.md](docs/REGLES_SKULL_KING.md) — read it
before touching `src/lib/scoring.ts`.

## Commands

```
npm start          # expo start — dev server, pick platform from the CLI menu
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npx tsc --noEmit   # typecheck
npm test           # jest (preset: jest-expo)
npx jest src/lib/scoring.test.ts   # run a single test file
npm run update-apk # eas-cli build --platform android --profile preview (non-interactive)
```

There is no linter configured in this repo. Tests are Jest (`jest-expo` preset,
config lives in the `jest` key of `package.json`), currently covering
`src/lib/scoring.ts` only — extend there first when touching scoring logic.
Verify changes with `npx tsc --noEmit` + `npm test`, and by running the app.

## Architecture

Single Zustand store drives the whole app; there is no navigation library.
`App.tsx` reads `screen` from the store and renders one of five screen
components directly (`HomeScreen`, `SetupScreen`, `GamesScreen`, `RoundScreen`,
`ScoreboardScreen`) via if/else — switching screens is just `setScreen(...)`.

- **`src/lib/store.ts`** — the single source of truth. A Zustand store
  (`persist` + AsyncStorage, `partialize`d to persist only `game`, not
  `screen`/`hydrated`) holding the active `Game` and current `Screen`. All game
  mutations (bids, tricks, bonuses, round commits) go through actions here,
  which apply immutable patches to `game.rounds[round][playerId]`. Wait for
  `hydrated` before trusting `game` (see the loading branch in `App.tsx`).
- **`src/lib/types.ts`** — domain types: `Game`, `Player`, `RoundEntry`
  (`bid`/`tricks`/`bonus`/`validated`), `Screen`. `Game.rounds` is a sparse
  `Record<round, Record<playerId, RoundEntry>>` — a round only "counts" once
  its entries are `validated`.
- **`src/lib/scoring.ts`** — pure calculation functions (`bidScore`,
  `roundTotal`, `cumulativeTotal(s)`, `ranking`), no store/React dependency.
  This is the classic "Skull King" scoring system per
  docs/REGLES_SKULL_KING.md §4.A. Card count per round currently comes from
  `cardsForRound(round) = round` (standard format only — alternate formats
  from the rules doc are not yet implemented).
- **`src/screens/`** — one container per screen; these are the only files that
  read/write the store (`useStore`) and orchestrate flow between screens.
- **`src/components/`** — presentational, prop-driven only. No store or
  navigation access from here — data and callbacks come from the parent
  screen. Keep it that way when adding components.
- **`src/theme.ts`** — shared design tokens (`colors`, `spacing`, `radius`,
  `opacity`, `goldTint`). Use these instead of magic values/inline colors.
- **Post-game score editing**: once `game.finishedAt` is set, `ScoreboardScreen`
  makes each row of `ScoreTable` touchable (`onRoundPress`) to reopen that round
  in `RoundScreen` for correction. This reuses the existing `goToRound`/
  `updateEntry` actions (no dedicated store state) — `updateEntry` preserves
  `validated: true` via spread, so edits apply immediately without
  re-committing. `RoundScreen` derives `editMode` from `!!game.finishedAt` to
  swap its header/footer copy and skip the commit flow, and `ScoreTable`
  gates its "current round" highlight on `!game.finishedAt` so a round
  reopened for editing isn't shown as if it were in progress.

## Conventions

- TypeScript strict mode is on (`tsconfig.json`); keep it passing, no `any`.
- Comments and some UI copy are in French — match the existing language when
  editing nearby code/docs.
- Presentational components must stay store-agnostic and navigation-agnostic
  (props + callbacks in, JSX out) so they're reusable and testable in
  isolation — this is enforced by convention, not tooling, so watch for it in
  review.
- A dedicated `react-native-expert` subagent is configured
  (`.claude/agents/react-native-expert.md`) for RN/Expo component work,
  covering clean-code, performance (list virtualization, selector
  re-renders, memoization-on-evidence-only), and accessibility conventions in
  more depth than this file.
