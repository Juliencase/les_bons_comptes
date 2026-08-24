# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

"Les Bons Comptes" — a React Native (Expo) mobile app for score-keeping card
and board games. It's built to host several games (see `GamesScreen` and its
`GAMES` list in `src/lib/games.ts`, designed to grow); **Skull King** (both
scoring systems — classic and Rascal, incl. the optional cannonball bid) and
**Belote** (classic, contract fixed at 82 — no coinche) are implemented so
far. Local-only, offline, no backend: game state is persisted on-device via
AsyncStorage. Full Skull King rules (used to derive its scoring engine) are in
[docs/REGLES_SKULL_KING.md](docs/REGLES_SKULL_KING.md) — read it before
touching `src/lib/scoring.ts`. Belote has no separate rules doc; its scoring
rules are documented inline as comments in `src/lib/belote/scoring.ts`.

The two games are **not** built on a shared engine — Skull King is
per-player/per-round (mise, plis, bonus), Belote is per-team/per-hand
(points comptés, contrat, capot). Each has its own type module, scoring
engine, store slice, action set, and screens (see Architecture below) —
don't assume logic can be shared across them.

## Commands

```
npm start          # expo start — dev server, pick platform from the CLI menu
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web (needs react-dom + react-native-web, not installed by default)
npx tsc --noEmit   # typecheck
npm test           # jest (preset: jest-expo)
npx jest src/lib/scoring.test.ts          # Skull King engine tests (unit)
npx jest src/lib/belote/scoring.test.ts   # Belote engine tests (unit)
npx jest src/lib/store.test.ts            # Skull King store tests (flows + migrations)
npx jest src/lib/stats.test.ts            # Skull King end-of-game awards
npm run update-apk # eas-cli build --platform android --profile preview (non-interactive)
```

There is no linter configured in this repo. Tests are Jest (`jest-expo` preset,
config lives in the `jest` key of `package.json`), on two levels:

- **unit** — the pure engines `src/lib/scoring.ts` (Skull King, both scoring
  systems), `src/lib/belote/scoring.ts` (Belote) and `src/lib/stats.ts` (the
  end-of-game awards). Extend the matching test file first when touching either
  engine.
- **functional** — `src/lib/store.test.ts` drives the Skull King store through
  its actions the way the screens do (create → enter → validate → correct),
  and covers `migratePersistedState` (the persisted-state migrations, exported
  from `store.ts` for that reason). It mocks AsyncStorage with the package's
  own jest mock, at the top of the file — there is no global jest setup file.
  Belote has no store-level tests yet.

There are **no component/screen tests**: `@testing-library/react-native` is not
a dependency, so UI changes are only covered by `npx tsc --noEmit`. Verify
changes with `npx tsc --noEmit` + `npm test`, and by running the app.

## Architecture

Single Zustand store drives the whole app; there is no navigation library.
`App.tsx` reads `screen` from the store and renders the matching screen
component via if/else — switching screens is just `setScreen(...)`. `Screen`
(`src/lib/types.ts`) lists every screen key across both games, including the
`belote-*` ones.

- **`src/lib/store.ts`** — the single source of truth. A Zustand store
  (`persist` + AsyncStorage, `partialize`d to persist `game` and `beloteGame`,
  not `screen`/`hydrated`) holding **two independent game slots** — the active
  Skull King `Game` and the active Belote `BeloteGame` — plus the current
  `Screen`. A player can have an unfinished game of each in parallel; leaving
  one game's screens doesn't touch the other's state. Skull King mutations
  (bids, tricks, bonuses, bid kinds, round commits) apply immutable patches to
  `game.rounds[round][playerId]` via `updateEntry`; Belote mutations
  (taker, points, capot, Belote-Rebelote, hand commits) apply immutable
  patches to `beloteGame.hands[hand]` via `updateHand`. Wait for `hydrated`
  before trusting either game (see the loading branch in `App.tsx`).
- **`src/lib/types.ts`** — Skull King domain types: `Game`, `Player`,
  `RoundEntry` (`bid`/`tricks`/`bonus`/`bidKind`/`validated`), `GameSetup`
  (what `SetupScreen` chooses: `cardsPerRound` + `scoreSystem` +
  `cannonballRule`, spread into `Game`), plus the shared `Screen` union used
  by both games. `Game.rounds` is a sparse
  `Record<round, Record<playerId, RoundEntry>>` — a round only "counts" once
  its entries are `validated`.
- **`src/lib/scoring.ts`** — pure calculation functions (`bidScore`,
  `rascalScore`, `roundTotal`, `cumulativeTotal(s)`, `ranking`), no
  store/React dependency. It implements **both** scoring systems, picked at
  game creation and stored on `Game.scoreSystem`: the classic one
  (`bidScore`, §4.A) and **Rascal** (`rascalScore`, §4.B — same potential
  `10 × cards` for everyone, won at 100 / 50 / 0 % depending on how close the
  bid was). Two consequences to keep in mind: `roundTotal` **needs the
  system** (it is not `bidScore + bonus` in Rascal — bonuses are weighted by
  the same 100/50/0 %, so they cannot be added after the fact), and the
  optional cannonball rule (`Game.cannonballRule`) makes each entry carry its
  own `bidKind` — read it through `bidKindOf(entry)`, never directly, since
  older entries have none. Card count per round comes from
  `cardsForRound(game.cardsPerRound, round)`, reading `Game.cardsPerRound` —
  the array set at game creation from the chosen `FormatDef`
  (`src/lib/formats.ts`, docs/REGLES_SKULL_KING.md §2). Round count is always
  `game.cardsPerRound.length`; there is no separate `totalRounds` field.
- **`src/lib/scoreSystems.ts`** — catalog + display copy for the two Skull
  King scoring systems (`SCORE_SYSTEMS`) and the two Rascal bid kinds
  (`BID_KINDS`), same shape/role as `formats.ts`. Labels shown in
  `SetupScreen`, `PlayerRoundRow`, `HomeScreen` and `ScoreboardScreen` come
  from here — no rule copy duplicated in the screens.
- **`src/lib/stats.ts`** — the end-of-game "palmarès": pure functions over
  `Game` (`playerStats` aggregates each player's validated rounds, `awards`
  turns them into titles). Adding a title = one entry in `AWARD_DEFS` (value to
  rank on, `mode: 'min'` to award the lowest, and the detail line). Two rules
  are enforced in `resolveAward` and worth keeping: a title nobody stands out
  on (everyone tied) or worth zero (no malus at all) is **not** awarded, and
  ties share it. Note `RoundEntry.bonus` is a net per round, so a +20 and a -5
  entered on the same round cannot be told apart — hence "bonus rounds" vs
  "malus rounds" rather than true totals; and a Rascal round scored at 0 %
  (`rascalOutcome === 'miss'`) contributes neither, so the palmarès never
  credits points the scoreboard does not show.
- **`src/lib/belote/`** — the Belote domain, isolated from Skull King's:
  - `types.ts`: `BeloteTeam` (2 players), `BeloteHandEntry`
    (`takerTeamId`/`teamAPoints`/`capotTeamId`/`beloteRebeloteTeamId`/`validated`),
    `BeloteGame` (`teams`, `targetScore`, `hands: Record<hand, BeloteHandEntry>`,
    no fixed hand count — the game ends when a team reaches `targetScore`).
  - `scoring.ts`: pure functions (`teamRawPoints`, `isContractHeld`,
    `handTeamScores`, `cumulativeTeamTotals`, `winningTeamId`). Key design
    point: `teamAPoints` is a **fixed property of team A**, not "the current
    taker's points" — this is deliberate, so that changing `takerTeamId`
    (who announced the contract) never changes what either team actually
    scored; only the contract-held/chute verdict is re-evaluated. `teamAPoints`
    is `number | null` — `null` means the hand hasn't been entered yet
    (`isHandComplete` gates whether a hand can be validated, same pattern as
    Skull King's null `bid`/`tricks`).
- **`src/screens/`** — one container per screen; these are the only files that
  read/write the store (`useStore`) and orchestrate flow between screens.
  Belote screens (`BeloteHomeScreen`, `BeloteSetupScreen`, `BeloteRoundScreen`,
  `BeloteScoreboardScreen`) mirror the Skull King ones
  (`HomeScreen`/`SetupScreen`/`RoundScreen`/`ScoreboardScreen`) structurally.
  Where the two games' screens only differ in *chrome* (not domain shape —
  see below), the shared piece was pulled into a presentational component
  instead of copy-pasted: `HomeScreen`/`BeloteHomeScreen` are both thin
  wrappers around `GameHomeScreen` (image/title/labels/callbacks in, JSX
  out); `SetupScreen`/`BeloteSetupScreen` still differ enough (player list
  vs. fixed 2-team layout, format picker vs. target-score picker) to stay
  separate, but both resolve blank name inputs via the shared
  `finalizePlayerNames` (`src/lib/names.ts`).
- **`src/components/`** — presentational, prop-driven only. No store or
  navigation access from here — data and callbacks come from the parent
  screen. Keep it that way when adding components. Genuinely shared:
  `ChipPicker` (format picker / target-score picker), `GameHomeScreen`
  (both home screens), `ScoreGrid` (the manche/hand × player/team grid with
  a touchable-row + current-row-highlight + total-row skeleton — used by
  both `ScoreTable` and `BeloteHandTable`, which now only supply their
  columns/rows/cell-width and stay responsible for their own per-row score
  math), `SegmentedToggle` (2-option exclusive picker, + an optional "none"
  pill — Belote's taker/capot/Belote-Rebelote and Skull King's Rascal bid
  kind; generic over its id type, so ids stay typed at each call site).
  `PointsInput` is Belote-only for now but written generically in case a
  future game needs it; `AwardList` (palmarès rows) is Skull-King-only for now
  but takes plain rows, so a Belote palmarès could reuse it as is. `PlayerRoundRow` is Skull-King-specific (different
  data shape, no Belote equivalent needed).
- **`src/theme.ts`** — shared design tokens (`colors`, `spacing`, `radius`,
  `opacity`, `goldTint`). Use these instead of magic values/inline colors.
- **Post-game score editing** (both games): once the game's `finishedAt` is
  set, its scoreboard screen makes each row of the round/hand table touchable
  (`onRoundPress`/`onHandPress`) to reopen that round/hand for correction.
  This reuses the existing `goToRound`/`updateEntry` (Skull King) or
  `goToBeloteHand`/`updateHand` (Belote) actions (no dedicated store state) —
  both preserve `validated: true` via spread, so edits apply immediately
  without re-committing. Each round/hand screen derives `editMode` from
  `!!game.finishedAt` to swap its header/footer copy and skip the commit
  flow. **Mid-game correction** also exists on both round-entry screens: a
  "‹ Manche précédente" ghost button (shown once past the first round/hand)
  calls `goToRound`/`goToBeloteHand` to go back, edit, and re-validate an
  earlier round without losing later ones — nothing is final until the game
  ends and even then it stays editable.
- **End-of-game awards** (Skull King only): once `finishedAt` is set,
  `ScoreboardScreen` shows a "palmarès" of fun titles (most/fewest tricks, most
  exact bids, …) between the ranking and the round table — see
  `src/lib/stats.ts`. It is recomputed from `Game` on every render, so
  correcting a round from the same screen updates it immediately, and it is
  simply hidden when no title can be awarded.

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
